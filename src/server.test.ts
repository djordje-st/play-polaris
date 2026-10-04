import { beforeEach, afterEach, expect, test, vi } from 'vitest'
import type * as CF from '@cloudflare/workers-types'
import server, { CollaborationRoom } from './server'

vi.mock('@tanstack/solid-start/server-entry', () => ({
  default: { fetch: () => new Response('app') },
}))

class Socket {
  send = vi.fn()
  close = vi.fn()
  attachment: unknown = null
  serializeAttachment(value: unknown) {
    this.attachment = value
  }
  deserializeAttachment() {
    return this.attachment
  }
}

let sockets: Socket[]
let ctx: CF.DurableObjectState
const NativeResponse = Response

beforeEach(() => {
  sockets = []
  ctx = {
    setWebSocketAutoResponse: vi.fn(),
    getWebSockets: () => sockets,
    acceptWebSocket: (ws: Socket) => sockets.push(ws),
  } as unknown as CF.DurableObjectState
  vi.stubGlobal(
    'WebSocketRequestResponsePair',
    class {
      constructor(
        readonly request: string,
        readonly response: string
      ) {}
    }
  )
  vi.stubGlobal(
    'WebSocketPair',
    class {
      0 = new Socket()
      1 = new Socket()
    }
  )
  vi.stubGlobal(
    'Response',
    class {
      constructor(
        body: BodyInit | null,
        init?: ResponseInit & { webSocket?: unknown }
      ) {
        return init?.status === 101
          ? { status: 101, webSocket: init.webSocket }
          : new NativeResponse(body, init)
      }
    }
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('routes same-origin WebSockets to rooms and keeps app requests on TanStack', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('room'))
  const getByName = vi.fn(() => ({ fetch }))
  const env = { ROOMS: { getByName } as unknown as CF.DurableObjectNamespace }
  const request = (path: string, headers: Record<string, string> = {}) =>
    new Request(`https://example.com${path}`, { headers })

  expect(await (await server.fetch(request('/builder'), env)).text()).toBe(
    'app'
  )
  expect((await server.fetch(request('/api/rooms/bad'), env)).status).toBe(404)

  const path = `/api/rooms/${crypto.randomUUID()}`

  expect((await server.fetch(request(path), env)).status).toBe(426)
  expect(
    (
      await server.fetch(
        request(path, { Upgrade: 'websocket', Origin: 'https://evil.example' }),
        env
      )
    ).status
  ).toBe(403)
  expect(
    await (
      await server.fetch(
        request(path, { Upgrade: 'websocket', Origin: 'https://example.com' }),
        env
      )
    ).text()
  ).toBe('room')
  expect(getByName).toHaveBeenCalledWith(path.slice('/api/rooms/'.length))
})

test('hibernatable room relays frames without storage and recovers the connected sockets after reconstruction', () => {
  const room = new CollaborationRoom(ctx)

  expect(room.fetch().status).toBe(101)
  expect(sockets[0]!.send).toHaveBeenCalledWith('sync')
  room.fetch()
  expect(sockets[0]!.send).toHaveBeenCalledWith('{"peers":2}')

  const first = sockets[0]!
  const second = sockets[1]!

  first.send.mockClear()
  second.send.mockClear()

  const restored = new CollaborationRoom(ctx)
  const frame = new Uint8Array([1, 0]).buffer

  restored.webSocketMessage(first as unknown as CF.WebSocket, frame)
  expect(first.send).not.toHaveBeenCalled()
  expect(second.send).toHaveBeenCalledWith(frame)
  Reflect.apply(restored.webSocketClose, restored, [first, 1005, ''])
  expect(first.close).toHaveBeenCalledWith(1000)
  expect(second.send).toHaveBeenCalledWith('{"peers":1}')
  second.send.mockImplementationOnce(() => {
    throw new Error('Gone')
  })
  restored.webSocketMessage(first as unknown as CF.WebSocket, frame)
  expect(second.close).toHaveBeenCalledWith(1011, 'Reconnect to the room')

  while (sockets.length < 16) {
    room.fetch()
  }

  expect(room.fetch().status).toBe(429)
})

test('rejects malformed, oversized and excessive messages', () => {
  const room = new CollaborationRoom(ctx)

  room.fetch()

  const ws = sockets[0]! as unknown as CF.WebSocket

  for (const message of [
    'bad',
    new ArrayBuffer(0),
    new Uint8Array([2, 0]).buffer,
    new ArrayBuffer(1_048_577),
  ]) {
    room.webSocketMessage(ws, message)
  }

  expect(sockets[0]!.close).toHaveBeenCalledTimes(4)
  vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 2000)

  for (let i = 0; i < 257; i++) {
    room.webSocketMessage(ws, new Uint8Array([0, 0]).buffer)
  }

  expect(sockets[0]!.close).toHaveBeenCalledTimes(5)
})
