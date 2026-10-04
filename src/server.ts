import handler from '@tanstack/solid-start/server-entry'
import type * as CF from '@cloudflare/workers-types'

declare const WebSocketPair: typeof CF.WebSocketPair
declare const WebSocketRequestResponsePair: typeof CF.WebSocketRequestResponsePair
declare const Response: typeof CF.Response

export default {
  fetch(request: Request, env: { ROOMS: CF.DurableObjectNamespace }) {
    const url = new URL(request.url)

    if (!url.pathname.startsWith('/api/rooms/')) {
      return handler.fetch(request)
    }

    const room = url.pathname.slice('/api/rooms/'.length)

    if (!/^[0-9a-f-]{36}$/.test(room)) {
      return new Response('Room not found', { status: 404 })
    }

    if (
      request.method !== 'GET' ||
      request.headers.get('Upgrade')?.toLowerCase() !== 'websocket'
    ) {
      return new Response('WebSocket required', { status: 426 })
    }

    if (request.headers.get('Origin') !== url.origin) {
      return new Response('Forbidden', { status: 403 })
    }

    // The unguessable room ID is the edit capability; anyone with the link can join.
    return env.ROOMS.getByName(room).fetch(request.url, {
      headers: Object.fromEntries(request.headers),
    })
  },
}

export class CollaborationRoom {
  constructor(private ctx: CF.DurableObjectState) {
    ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('ping', 'pong')
    )
  }

  fetch() {
    if (this.ctx.getWebSockets().length >= 16) {
      return new Response('Room is full', { status: 429 })
    }

    const pair = new WebSocketPair()

    this.ctx.acceptWebSocket(pair[1])
    this.broadcast(JSON.stringify({ peers: this.ctx.getWebSockets().length }))
    // Ask every browser for a state vector, including its offline changes.
    this.broadcast('sync')

    return new Response(null, { status: 101, webSocket: pair[0] })
  }

  webSocketMessage(ws: CF.WebSocket, message: string | ArrayBuffer) {
    const rate = ws.deserializeAttachment() as {
      at: number
      count: number
    } | null
    const now = Date.now()
    const count = rate && now - rate.at < 1000 ? rate.count + 1 : 1

    ws.serializeAttachment({ at: count === 1 ? now : rate!.at, count })

    if (
      count > 256 ||
      typeof message === 'string' ||
      message.byteLength > 1_048_576 ||
      message.byteLength < 2 ||
      new Uint8Array(message)[0]! > 1
    ) {
      ws.close(1008, 'Invalid or excessive room traffic')

      return
    }

    this.broadcast(message, ws)
  }

  webSocketClose(ws: CF.WebSocket) {
    // Browser close() can report 1005, which cannot be sent in a close frame.
    ws.close(1000)
    this.broadcast(
      JSON.stringify({
        peers: this.ctx.getWebSockets().filter(peer => peer !== ws).length,
      }),
      ws
    )
  }

  private broadcast(message: string | ArrayBuffer, sender?: CF.WebSocket) {
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === sender) {
        continue
      }

      try {
        ws.send(message)
      } catch {
        ws.close(1011, 'Reconnect to the room')
      }
    }
  }
}
