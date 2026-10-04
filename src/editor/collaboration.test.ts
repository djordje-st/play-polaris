// @vitest-environment happy-dom

import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { IDBFactory, IDBDatabase } from 'fake-indexeddb'
import * as Y from 'yjs'
import { catalogs, resetEditor } from '../test/editor'
import { createRoom, joinRoom, roomId, roomUrl } from './collaboration'
import { SharedDocument } from './shared'
import { loadWorkspace } from './persistence'
import {
  canRedo,
  canUndo,
  currentPage,
  editor,
  initWorkspace,
  redo,
  refreshShared,
  renamePage,
  setAttr,
  setText,
  setVersion,
  setViewport,
  snapshotOf,
  undo,
} from './store'

class Socket {
  static OPEN = 1
  static all: Socket[] = []
  readyState = 0
  binaryType = ''
  sent: Array<Uint8Array | string> = []
  onopen?: () => void
  onclose?: () => void
  onerror?: () => void
  onmessage?: (event: { data: unknown }) => void
  constructor(readonly url: URL) {
    Socket.all.push(this)
  }
  open() {
    this.readyState = 1
    this.onopen?.()
  }
  send(data: Uint8Array | string) {
    this.sent.push(data)
  }
  receive(data: unknown) {
    this.onmessage?.({ data })
  }
  close() {
    this.readyState = 3
    this.onclose?.()
  }
}

const sessions: Array<ReturnType<typeof joinRoom>> = []
const start = (id: string) => {
  const session = joinRoom(id)

  sessions.push(session)

  return session
}
const packet = (kind: number, payload: Uint8Array) =>
  new Uint8Array([kind, ...payload]).buffer
const latest = () => Socket.all.at(-1)!

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory())
  vi.stubGlobal('WebSocket', Socket)
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
  })
  Socket.all = []
  history.replaceState(null, '', '/builder')
  resetEditor('<s-button>Original</s-button>')
})
afterEach(async () => {
  vi.restoreAllMocks()

  for (const session of sessions.splice(0)) {
    await session.close()
  }

  vi.useRealTimers()
  vi.unstubAllGlobals()
})

test('shared sessions keep personal storage separate, persist CRDT edits and restore after reload', async () => {
  expect(roomId()).toBeNull()

  const url = await createRoom()

  history.replaceState(null, '', url)

  const id = roomId()!

  expect(roomUrl(id)).toBe(url)

  const session = start(id)
  const saved = await session.workspace

  expect(saved.pages).toEqual(editor.state.doc.pages)
  expect(await loadWorkspace()).toBeNull()
  initWorkspace(saved, catalogs.v1)
  refreshShared(session.shared)
  latest().open()
  latest().receive(JSON.stringify({ peers: 2 }))
  expect(editor.state.room).toMatchObject({ status: 'connected', peers: 2 })
  latest().receive(JSON.stringify({ peers: -1 }))
  expect(editor.state.room?.peers).toBe(2)

  const button = currentPage().nodes[0]!.id

  setText(button, 'Edited together')
  setAttr(button, 'variant', 'primary')
  setVersion('v2')
  setViewport('mobile')
  expect(canUndo()).toBe(true)
  undo()
  expect(canRedo()).toBe(true)
  redo()
  expect(
    latest().sent.filter(data => typeof data !== 'string' && data[0] === 1)
      .length
  ).toBeGreaterThan(0)
  dispatchEvent(new Event('pagehide'))
  document.dispatchEvent(new Event('visibilitychange'))
  await session.close()
  expect(editor.state.saveState).toBe('saved')

  const restored = start(id)

  expect((await restored.workspace).pages).toEqual(editor.state.doc.pages)
  expect((await restored.workspace).viewport).toBe('mobile')
  expect(restored.shared.history.canUndo()).toBe(false)
  await restored.close()

  const returnImmediately = start(id)

  await returnImmediately.close()
  await vi.waitFor(() => expect(Socket.all).toHaveLength(2))
})

test('late joiners wait for peers, exchange missing state, reconnect and resync offline edits', async () => {
  const peer = new SharedDocument()

  peer.write({ version: 'v1', pages: [] }, editor.state.doc)

  const session = start(crypto.randomUUID())
  let resolved = false

  void session.workspace.then(() => {
    resolved = true
  })
  await vi.waitFor(() => expect(Socket.all).toHaveLength(1))
  expect(resolved).toBe(false)

  const ws = latest()

  ws.open()
  ws.receive('sync')
  expect(ws.sent).toHaveLength(2)
  ws.receive(packet(1, Y.encodeStateAsUpdate(peer.doc)))
  expect((await session.workspace).pages).toEqual(peer.read()!.pages)
  refreshShared(session.shared)
  ws.receive(packet(0, Y.encodeStateVector(peer.doc)))
  expect((ws.sent.at(-1) as Uint8Array)[0]).toBe(1)

  const before = ws.sent.length

  ws.receive(packet(1, Y.encodeStateAsUpdate(peer.doc)))
  expect(ws.sent).toHaveLength(before)
  ws.onerror?.()
  expect(editor.state.room?.status).toBe('offline')
  renamePage(currentPage().id, 'Offline edit')
  await vi.advanceTimersByTimeAsync(500)
  expect(Socket.all).toHaveLength(2)
  latest().open()
  latest().receive(packet(0, Y.encodeStateVector(peer.doc)))
  Y.applyUpdate(peer.doc, (latest().sent.at(-1) as Uint8Array).subarray(1))
  expect(peer.read()!.pages[0]!.name).toBe('Offline edit')
  await vi.advanceTimersByTimeAsync(25_000)
  expect(latest().sent.at(-1)).toBe('ping')
  latest().receive('pong')
  await vi.advanceTimersByTimeAsync(25_000)
  expect(latest().readyState).toBe(1)
  await vi.advanceTimersByTimeAsync(25_000)
  expect(latest().readyState).toBe(3)
  await vi.advanceTimersByTimeAsync(500)
  expect(Socket.all).toHaveLength(3)
  peer.doc.destroy()
})

test('simultaneous local room saves merge before a returning browser loads them', async () => {
  const id = new URL(await createRoom()).searchParams.get('room')!
  const a = start(id)
  const b = start(id)

  await Promise.all([a.workspace, b.workspace])

  const beforeA = a.shared.read()!
  const beforeB = b.shared.read()!

  a.shared.write(beforeA, {
    ...beforeA,
    pages: beforeA.pages.map(p => ({ ...p, name: 'A renamed' })),
  })

  const changed = structuredClone(beforeB)

  changed.pages[0]!.nodes.push({
    id: 'offline',
    tag: '#text',
    text: 'B inserted',
  })
  b.shared.write(beforeB, changed)
  await Promise.all([a.close(), b.close()])

  const merged = await start(id).workspace

  expect(merged.pages[0]!.name).toBe('A renamed')
  expect(merged.pages[0]!.nodes.at(-1)).toEqual({
    id: 'offline',
    tag: '#text',
    text: 'B inserted',
  })
})

test('room storage failures are visible and do not prevent subsequent saves', async () => {
  const id = new URL(await createRoom()).searchParams.get('room')!
  const session = start(id)

  await session.workspace
  refreshShared(session.shared)
  vi.spyOn(IDBDatabase.prototype, 'transaction').mockImplementationOnce(() => {
    throw new Error('Storage full')
  })
  renamePage(currentPage().id, 'Keep this edit')
  await vi.advanceTimersByTimeAsync(400)
  expect(editor.state.saveState).toBe('error')
  vi.spyOn(IDBDatabase.prototype, 'transaction').mockImplementationOnce(() => {
    throw new Error('Still full')
  })
  await expect(session.close(true)).rejects.toThrow('Could not save this room')
  expect(session.shared.doc.isDestroyed).toBe(false)
  renamePage(currentPage().id, 'Recovered save')
  await session.close(true)
  expect(editor.state.saveState).toBe('saved')
  expect((await start(id).workspace).pages[0]!.name).toBe('Recovered save')
})

test.each([
  new Uint8Array([2, 0]).buffer,
  new Uint8Array([1]).buffer,
  new ArrayBuffer(1_048_577),
  '{',
])('invalid peer frames stop sync without losing saved work', async data => {
  const id = new URL(await createRoom()).searchParams.get('room')!
  const session = start(id)

  await session.workspace
  latest().open()
  latest().receive(data)
  expect(editor.state.room).toMatchObject({ status: 'error' })
  await vi.advanceTimersByTimeAsync(10_000)
  expect(Socket.all).toHaveLength(1)
})

test('oversized updates pause synchronization with an actionable message', async () => {
  const id = new URL(await createRoom()).searchParams.get('room')!
  const session = start(id)

  await session.workspace
  latest().open()
  session.shared.settings.set('large', 'x'.repeat(1_048_576))
  expect(editor.state.room?.error).toContain('1 MB')
  await vi.advanceTimersByTimeAsync(1000)
  expect(Socket.all).toHaveLength(1)
})

test('invalid links and unavailable local storage fail explicitly', async () => {
  history.replaceState(null, '', '/builder?room=invalid')
  expect(roomId).toThrow('Invalid collaboration link')
  vi.stubGlobal('indexedDB', {
    open: () => {
      throw new Error('Blocked')
    },
  })
  await expect(createRoom(snapshotOf())).rejects.toThrow('Blocked')

  const session = start(crypto.randomUUID())

  await expect(session.workspace).rejects.toThrow('Blocked')
  expect(editor.state.room?.error).toContain('storage')
})
