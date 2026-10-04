// @vitest-environment happy-dom

import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import manifestV1 from 'polaris-types-v1/custom-elements?raw'
import manifestV2 from 'polaris-types-v2/custom-elements?raw'
import { mount, button } from '../test/dom'
import type * as Store from '../editor/store'

const persistence = vi.hoisted(() => ({
  loadWorkspace: vi.fn(),
  startSession: vi.fn(),
  takeOver: vi.fn(),
  purgeWorkspace: vi.fn(),
}))
const collaboration = vi.hoisted(() => ({
  roomId: vi.fn(),
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
  roomUrl: (id: string) => `https://example.com/builder?room=${id}`,
}))

vi.mock('../editor/persistence', () => persistence)
vi.mock('../editor/collaboration', () => collaboration)

let store: typeof Store

beforeEach(async () => {
  vi.resetModules()
  localStorage.setItem('polaris-playground:tour-seen', '1')
  persistence.loadWorkspace.mockReset().mockResolvedValue(null)
  collaboration.roomId.mockReset().mockReturnValue(null)
  collaboration.createRoom.mockReset()
  collaboration.joinRoom.mockReset()
  persistence.startSession.mockReset().mockResolvedValue(undefined)
  persistence.purgeWorkspace.mockReset().mockResolvedValue(undefined)
  persistence.takeOver
    .mockReset()
    .mockImplementation(async () => store.setAccess('editing'))
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async (url: string) =>
        new Response(url.includes('v2') ? manifestV2 : manifestV1)
    )
  )
  store = await import('../editor/store')
})
afterEach(() => {
  store.dismissToast()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

async function start() {
  const { Builder } = await import('./Builder')
  const root = mount(() => <Builder />)

  await vi.waitFor(() => expect(store.editor.state.ready).toBe(true))

  return root
}

test('sharing creates a separate room and reports a failed local save', async () => {
  const assign = vi.spyOn(location, 'assign').mockImplementation(() => {})
  const root = await start()

  collaboration.createRoom.mockRejectedValueOnce(new Error('Storage blocked'))
  button('Start shared session', root).click()
  await vi.waitFor(() =>
    expect(root.textContent).toContain('Could not save the shared room')
  )
  expect(assign).not.toHaveBeenCalled()
  collaboration.createRoom.mockResolvedValueOnce(
    'https://example.com/builder?room=shared'
  )
  button('Start shared session', root).click()
  await vi.waitFor(() =>
    expect(assign).toHaveBeenCalledWith(
      'https://example.com/builder?room=shared'
    )
  )
})

test('joining waits for a saved copy, exposes connection state and leaves without touching personal storage', async () => {
  const { SharedDocument } = await import('../editor/shared')
  const shared = new SharedDocument()

  shared.write(
    { version: 'v1', pages: [] },
    {
      version: 'v1',
      pages: [{ id: 'shared-page', name: 'Shared page', nodes: [] }],
    }
  )
  shared.history.clear()

  const id = crypto.randomUUID()
  let receive!: (value: Store.Snapshot) => void
  const workspace = new Promise<Store.Snapshot>(resolve => {
    receive = resolve
  })
  const close = vi.fn().mockResolvedValue(undefined)

  collaboration.roomId.mockReturnValue(id)
  collaboration.joinRoom.mockReturnValue({ shared, workspace, close })
  store.setRoom({ id, status: 'connecting', peers: 0 })

  const { Builder } = await import('./Builder')
  const root = mount(() => <Builder />)

  expect(root.textContent).toContain('Connecting to the room')
  store.setRoom({ id, status: 'connected', peers: 1 })
  expect(root.textContent).toContain('Waiting for someone with a saved copy')
  receive({
    ...shared.read()!,
    pageId: 'shared-page',
    viewport: 'desktop',
    presets: [],
  })
  await vi.waitFor(() => expect(store.editor.state.ready).toBe(true))
  expect(persistence.loadWorkspace).not.toHaveBeenCalled()
  expect(persistence.startSession).not.toHaveBeenCalled()
  expect(root.textContent).toContain('1 person connected')
  expect(root.querySelector('[aria-label="Clear local data"]')).toBeNull()

  const link = root.querySelector<HTMLInputElement>('[aria-label="Room link"]')!

  link.dispatchEvent(new Event('focusin', { bubbles: true }))
  expect(link.value).toBe(collaboration.roomUrl(id))

  const copy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()

  button('Copy link', root).click()
  await vi.waitFor(() => expect(root.textContent).toContain('Room link copied'))
  copy.mockRejectedValueOnce(new Error('Clipboard blocked'))
  button('Copy link', root).click()
  await vi.waitFor(() =>
    expect(root.textContent).toContain('Select and copy the room link')
  )
  store.setRoom({ id, status: 'connected', peers: 2 })
  expect(root.textContent).toContain('2 people connected')
  store.setRoom({ id, status: 'offline', peers: 0 })
  expect(root.textContent).toContain('Reconnecting')
  store.setRoom({ id, status: 'error', peers: 0, error: 'Sync failed' })
  expect(root.textContent).toContain('Sync paused')

  const assign = vi.spyOn(location, 'assign').mockImplementation(() => {})

  close.mockRejectedValueOnce(new Error('Could not save this room'))
  button('Leave room', root).click()
  await vi.waitFor(() =>
    expect(root.textContent).toContain('Could not save this room')
  )
  expect(assign).not.toHaveBeenCalled()
  button('Leave room', root).click()
  await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/builder'))
  expect(close).toHaveBeenCalledTimes(2)
  expect(close).toHaveBeenLastCalledWith(true)
  shared.doc.destroy()
})

test('failed room storage never initializes a blank shared workspace', async () => {
  const id = crypto.randomUUID()

  collaboration.roomId.mockReturnValue(id)
  collaboration.joinRoom.mockReturnValue({
    workspace: Promise.reject(new Error('Blocked')),
    close: vi.fn(),
  })
  store.setRoom({
    id,
    status: 'error',
    peers: 0,
    error: 'Local room storage is unavailable.',
  })

  const { Builder } = await import('./Builder')
  const root = mount(() => <Builder />)

  await vi.waitFor(() =>
    expect(root.textContent).toContain('Could not open this room')
  )
  expect(store.editor.state.ready).toBe(false)
  expect(root.querySelector('a')?.getAttribute('href')).toBe('/builder')
  expect(persistence.startSession).not.toHaveBeenCalled()
})

test('startup shows loading, retries failed catalog requests and initializes a usable workspace', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 503 }))

  const { Builder } = await import('./Builder')
  const root = mount(() => <Builder />)

  expect(root.textContent).toContain('Loading the Polaris component catalog')
  await vi.waitFor(() =>
    expect(root.textContent).toContain("The component catalog didn't load")
  )
  button('Try again', root).click()
  await vi.waitFor(() => expect(store.editor.state.ready).toBe(true))
  expect(store.currentPage().name).toBe('Home')
  expect(persistence.startSession).toHaveBeenCalledOnce()
  expect(root.querySelector('[aria-label="Page name"]')).not.toBeNull()
  expect(fetch).toHaveBeenCalledTimes(2)
})

test('blocked storage starts a fresh editor while exposing unsaved state', async () => {
  persistence.loadWorkspace.mockRejectedValueOnce(new Error('Storage blocked'))

  const root = await start()

  expect(store.currentPage().name).toBe('Home')
  expect(root.textContent).toContain('Not saved')
  expect(persistence.startSession).toHaveBeenCalledOnce()
})

test('clearing local data requires confirmation and reports success or failure', async () => {
  const root = await start()
  const confirm = vi.fn().mockReturnValue(false)

  vi.stubGlobal('confirm', confirm)

  const clear = button('Clear local data', root)

  clear.click()
  expect(confirm).toHaveBeenCalledWith(
    expect.stringContaining('cannot be undone')
  )
  expect(persistence.purgeWorkspace).not.toHaveBeenCalled()
  confirm.mockReturnValue(true)

  let finish!: () => void
  const pending = new Promise<void>(resolve => (finish = resolve))

  persistence.purgeWorkspace.mockReturnValueOnce(pending)
  clear.click()
  expect(clear.disabled).toBe(true)
  clear.click()
  expect(persistence.purgeWorkspace).toHaveBeenCalledOnce()
  finish()
  await vi.waitFor(() => expect(clear.disabled).toBe(false))
  expect(root.textContent).toContain('Local data cleared')
  persistence.purgeWorkspace.mockRejectedValueOnce(new Error('Storage blocked'))
  clear.click()
  await vi.waitFor(() => expect(root.textContent).toContain('Storage blocked'))
  expect(clear.disabled).toBe(false)
})

test('restores saved version and viewport and reloads catalog after version changes', async () => {
  persistence.loadWorkspace.mockResolvedValueOnce({
    version: 'v2',
    pages: [{ id: 'saved', name: 'Saved page', nodes: [] }],
    pageId: 'saved',
    viewport: 'mobile',
    presets: [],
  })

  const root = await start()

  expect(store.catalog().version).toBe('v2')
  expect(store.currentPage().name).toBe('Saved page')
  expect(store.editor.state.viewport).toBe('mobile')
  expect(root.querySelector('iframe')!.srcdoc).toContain('polaris-2.0-rc.js')
  store.setVersion('v1')
  await vi.waitFor(() => expect(store.catalog().version).toBe('v1'))
  expect(persistence.startSession).toHaveBeenCalledOnce()
})

test('view-only banner takes ownership and the editor responds to keyboard, toast and drag state', async () => {
  const root = await start()

  store.setAccess('viewing')
  expect(root.querySelector('[inert]')).not.toBeNull()
  button('Edit here instead', root).click()
  await vi.waitFor(() => expect(store.editor.state.access).toBe('editing'))
  expect(root.querySelector('[inert]')).toBeNull()

  const action = vi.fn()

  store.notify('Saved', 'neutral', { label: 'Reverse', run: action })
  button('Reverse', root).click()
  expect(action).toHaveBeenCalledOnce()
  expect(store.editor.state.toast).toBeNull()
  store.notify('Failed', 'critical')
  expect(root.textContent).toContain('Failed')
  store.setDrag({ label: 'Dragging button', x: 12.5, y: 20.5, target: null })
  expect(root.textContent).toContain('Dragging button')
  store.setDrag({
    ...store.editor.state.drag!,
    target: {
      index: 0,
      parentId: null,
      refId: null,
      zone: 'inside',
      slot: '',
      error: 'Cannot drop here',
    },
  })
  expect(root.textContent).toContain('Cannot drop here')
  store.setDrag(null)
  store.select(store.currentPage().nodes[0]!.id)
  window.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
  )
  expect(store.editor.state.selectedId).toBeNull()
})

test('late WebMCP initialization retries and registers tools', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  await start()

  const context = { registerTool: vi.fn(), unregisterTool: vi.fn() }

  Object.defineProperty(document, 'modelContext', {
    configurable: true,
    value: context,
  })

  try {
    await vi.advanceTimersByTimeAsync(1500)
    expect(context.registerTool).toHaveBeenCalledTimes(27)
  } finally {
    Reflect.deleteProperty(document, 'modelContext')
  }
})
