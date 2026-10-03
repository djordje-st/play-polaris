// @vitest-environment happy-dom

import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { MockInstance } from 'vitest'
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { catalogs } from '../test/editor'
import type * as Store from './store'
import type * as Persistence from './persistence'

let store: typeof Store
let persistence: typeof Persistence
let channel: EventTarget & { postMessage: ReturnType<typeof vi.fn> }
let windowListeners: MockInstance<typeof window.addEventListener>
let documentListeners: MockInstance<typeof document.addEventListener>

const request = <T>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  vi.stubGlobal('indexedDB', new IDBFactory())
  vi.stubGlobal('navigator', {})
  vi.stubGlobal(
    'BroadcastChannel',
    class extends EventTarget {
      postMessage = vi.fn()
      constructor() {
        super()
        channel = this
      }
    }
  )
  windowListeners = vi.spyOn(window, 'addEventListener')
  documentListeners = vi.spyOn(document, 'addEventListener')
  store = await import('./store')
  persistence = await import('./persistence')
  store.setCatalog(catalogs.v1)
  store.initWorkspace(null, catalogs.v1)
})

afterEach(() => {
  for (const [type, listener, options] of windowListeners.mock.calls) {
    window.removeEventListener(type, listener, options)
  }

  for (const [type, listener, options] of documentListeners.mock.calls) {
    document.removeEventListener(type, listener, options)
  }

  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function start() {
  await persistence.startSession()
  await vi.waitFor(() =>
    expect(channel.postMessage).toHaveBeenCalledWith({ type: 'saved' })
  )
}

async function save() {
  await vi.advanceTimersByTimeAsync(400)
  await vi.waitFor(() => expect(store.editor.state.saveState).toBe('saved'))
}

test('starts empty, saves a workspace and persists only changed rows', async () => {
  expect(await persistence.loadWorkspace()).toBeNull()
  await start()
  expect(await persistence.loadWorkspace()).toEqual(store.snapshotOf())

  const put = vi.spyOn(IDBObjectStore.prototype, 'put')
  const original = store.currentPage()

  store.renamePage(original.id, 'Saved name')
  expect(store.editor.state.saveState).toBe('saving')
  await save()
  expect(put).toHaveBeenCalledTimes(1)
  expect((await persistence.loadWorkspace())?.pages[0]?.name).toBe('Saved name')
  put.mockClear()
  store.select(original.nodes[0]!.id)
  await vi.advanceTimersByTimeAsync(500)
  expect(put).not.toHaveBeenCalled()
  store.setViewport('mobile')
  await save()
  expect(put).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'workspace', viewport: 'mobile' })
  )
})

test('deletes page and preset rows and restores the remaining order', async () => {
  await start()

  const original = store.currentPage()
  const second = store.addPage('Second', [])
  const preset = store.savePreset({
    name: 'Saved',
    description: '',
    nodes: original.nodes,
  })!

  await save()
  store.deletePage(original.id)
  store.deletePreset(preset.id)
  await save()

  const snapshot = await persistence.loadWorkspace()
  const db = await request(indexedDB.open('polaris-playground-data', 10))

  expect(snapshot?.pages.map(page => page.id)).toEqual([second.id])
  expect(snapshot?.presets).toEqual([])
  expect(
    await request(db.transaction('pages').objectStore('pages').getAllKeys())
  ).toEqual([second.id])
  expect(
    await request(db.transaction('presets').objectStore('presets').count())
  ).toBe(0)
  db.close()
})

test('purges saved and pending work, legacy data and undo, then saves new edits', async () => {
  await start()
  store.addPage('Private page', [])
  store.savePreset({ name: 'Private component', description: '', nodes: [] })
  store.setViewport('mobile')
  await save()

  const legacy = await request(indexedDB.open('polaris-playground', 1))
  const unrelated = await request(indexedDB.open('unrelated-app', 1))

  legacy.close()
  unrelated.close()
  store.renamePage(store.currentPage().id, 'Pending edit')
  dispatchEvent(new Event('pagehide'))
  store.renamePage(store.currentPage().id, 'Debounced edit')
  store.notify('Deleted', 'neutral', { label: 'Undo', run: vi.fn() })

  const oldIds = store.editor.state.doc.pages.map(page => page.id)

  await persistence.purgeWorkspace()
  await vi.advanceTimersByTimeAsync(500)
  dispatchEvent(new Event('pagehide'))

  const fresh = await persistence.loadWorkspace()
  const db = await request(indexedDB.open('polaris-playground-data', 10))

  expect(fresh).toEqual(store.snapshotOf())
  expect(fresh).toMatchObject({
    version: 'v1',
    viewport: 'desktop',
    presets: [],
    pages: [{ name: 'Home', nodes: [] }],
  })
  expect(oldIds).not.toContain(fresh!.pageId)
  expect(
    await request(db.transaction('pages').objectStore('pages').getAllKeys())
  ).toEqual([fresh!.pageId])
  expect(
    await request(db.transaction('presets').objectStore('presets').count())
  ).toBe(0)
  expect(await indexedDB.databases()).toEqual(
    expect.arrayContaining([expect.objectContaining({ name: 'unrelated-app' })])
  )
  expect(
    (await indexedDB.databases()).some(
      database => database.name === 'polaris-playground'
    )
  ).toBe(false)
  expect(store.editor.state.past).toEqual([])
  expect(store.editor.state.future).toEqual([])
  expect(store.editor.state.toast).toBeNull()
  store.undo()
  expect(store.snapshotOf()).toEqual(fresh)
  store.renamePage(store.currentPage().id, 'New work')
  await save()
  expect((await persistence.loadWorkspace())?.pages[0]?.name).toBe('New work')
  db.close()
})

test('failed purge preserves the workspace and does not break subsequent saves', async () => {
  await start()

  const original = store.snapshotOf()
  const put = vi
    .spyOn(IDBObjectStore.prototype, 'put')
    .mockImplementationOnce(() => {
      throw new Error('Storage blocked')
    })

  await expect(persistence.purgeWorkspace()).rejects.toThrow('Storage blocked')
  expect(await persistence.loadWorkspace()).toEqual(original)
  expect(store.snapshotOf()).toEqual(original)
  put.mockRestore()
  store.renamePage(store.currentPage().id, 'Recovered after purge failure')
  await save()
  expect((await persistence.loadWorkspace())?.pages[0]?.name).toBe(
    'Recovered after purge failure'
  )
  store.setAccess('viewing')
  await expect(persistence.purgeWorkspace()).rejects.toThrow('editing tab')
})

test('reports failed writes and recovers on the next change', async () => {
  await start()

  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  const put = vi
    .spyOn(IDBObjectStore.prototype, 'put')
    .mockImplementationOnce(() => {
      throw new Error('quota')
    })

  store.renamePage(store.currentPage().id, 'Failed')
  await vi.advanceTimersByTimeAsync(400)
  await vi.waitFor(() => expect(store.editor.state.saveState).toBe('error'))
  expect(error).toHaveBeenCalled()
  expect((await persistence.loadWorkspace())?.pages[0]?.name).toBe('Home')
  put.mockRestore()
  store.renamePage(store.currentPage().id, 'Recovered')
  await save()
  expect((await persistence.loadWorkspace())?.pages[0]?.name).toBe('Recovered')
})

test('flushes pending changes for a tab handover and pagehide', async () => {
  await start()
  store.renamePage(store.currentPage().id, 'Handover')
  channel.dispatchEvent(
    new MessageEvent('message', { data: { type: 'flush' } })
  )
  await vi.waitFor(() =>
    expect(channel.postMessage).toHaveBeenCalledWith({ type: 'flushed' })
  )
  expect((await persistence.loadWorkspace())?.pages[0]?.name).toBe('Handover')
  store.renamePage(store.currentPage().id, 'Closing')
  dispatchEvent(new Event('pagehide'))
  await vi.waitFor(async () =>
    expect((await persistence.loadWorkspace())?.pages[0]?.name).toBe('Closing')
  )
})

test.each([true, false])(
  'migrates legacy storage (record present: %s)',
  async hasRecord => {
    const open = indexedDB.open('polaris-playground', 1)

    open.onupgradeneeded = () => open.result.createObjectStore('kv')

    const db = await request(open)

    if (hasRecord) {
      await request(
        db.transaction('kv', 'readwrite').objectStore('kv').put(
          {
            doc: store.editor.state.doc,
            pageId: store.editor.state.pageId,
            viewport: 'tablet',
          },
          'workspace'
        )
      )
    }

    db.close()

    const snapshot = await persistence.loadWorkspace()

    expect(snapshot?.viewport ?? null).toBe(hasRecord ? 'tablet' : null)

    if (snapshot) {
      expect(snapshot.presets).toEqual([])
      expect(snapshot.pages).toEqual(store.editor.state.doc.pages)
    }

    await vi.waitFor(async () =>
      expect(
        (await indexedDB.databases()).some(
          database => database.name === 'polaris-playground'
        )
      ).toBe(false)
    )
  }
)

test('a waiting tab mirrors saves and purges before becoming editor', async () => {
  await start()

  const writer = persistence
  const saved = store.snapshotOf()

  // Import a new session with the same database and a fresh store, like another tab.
  vi.resetModules()
  store = await import('./store')
  store.setCatalog(catalogs.v1)
  store.initWorkspace(saved, catalogs.v1)

  let grant: LockGrantedCallback<unknown> | undefined
  const lockRequest = vi.fn(
    (
      _name: string,
      options: LockOptions,
      callback: LockGrantedCallback<unknown>
    ) => {
      if (options.ifAvailable) {
        return Promise.resolve(callback(null))
      }

      grant = callback

      return new Promise(() => {})
    }
  )

  vi.stubGlobal('navigator', { locks: { request: lockRequest } })
  persistence = await import('./persistence')
  await persistence.startSession()
  expect(store.editor.state.access).toBe('viewing')
  channel.dispatchEvent(
    new MessageEvent('message', { data: { type: 'saved' } })
  )

  const db = await request(indexedDB.open('polaris-playground-data', 10))

  await request(
    db
      .transaction('pages', 'readwrite')
      .objectStore('pages')
      .put({ ...saved.pages[0], name: 'Changed in the writer tab' })
  )
  channel.dispatchEvent(
    new MessageEvent('message', { data: { type: 'saved' } })
  )
  await vi.waitFor(() =>
    expect(store.currentPage().name).toBe('Changed in the writer tab')
  )
  await writer.purgeWorkspace()
  channel.dispatchEvent(
    new MessageEvent('message', { data: { type: 'saved' } })
  )
  await vi.waitFor(() => expect(store.currentPage().nodes).toEqual([]))
  db.close()
  grant!({ name: 'editor', mode: 'exclusive' })
  await vi.waitFor(() => expect(store.editor.state.access).toBe('editing'))
  await save()
  expect((await persistence.loadWorkspace())?.pages).toEqual([
    store.currentPage(),
  ])
  expect(store.currentPage().name).toBe('Home')
})

test('visibility changes flush pending edits and unchanged flushes avoid writes', async () => {
  await start()

  const put = vi.spyOn(IDBObjectStore.prototype, 'put')

  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
  store.renamePage(store.currentPage().id, 'Hidden tab')
  document.dispatchEvent(new Event('visibilitychange'))
  await vi.waitFor(async () =>
    expect((await persistence.loadWorkspace())?.pages[0]?.name).toBe(
      'Hidden tab'
    )
  )
  put.mockClear()
  dispatchEvent(new Event('pagehide'))
  await vi.advanceTimersByTimeAsync(500)
  expect(put).not.toHaveBeenCalled()
})

test('a failed database open can retry after the incompatible database is removed', async () => {
  const incompatible = await request(
    indexedDB.open('polaris-playground-data', 11)
  )

  incompatible.close()
  await expect(persistence.loadWorkspace()).rejects.toMatchObject({
    name: 'VersionError',
  })
  await request(indexedDB.deleteDatabase('polaris-playground-data'))
  expect(await persistence.loadWorkspace()).toBeNull()
  // A version change closes the cached connection, allowing deletion and reopening.
  await request(indexedDB.deleteDatabase('polaris-playground-data'))
  expect(await persistence.loadWorkspace()).toBeNull()
})

test('takeover times out waiting for a closed tab and handles a rejected lock request', async () => {
  await start()
  store.setAccess('viewing')
  vi.stubGlobal('navigator', {
    locks: {
      request: vi.fn().mockRejectedValue(new Error('Lock unavailable')),
    },
  })

  const takeover = persistence.takeOver()

  channel.dispatchEvent(
    new MessageEvent('message', { data: { type: 'saved' } })
  )
  await vi.advanceTimersByTimeAsync(1000)
  await takeover
  expect(store.editor.state.access).toBe('viewing')
})

test('takeover requests a flush before stealing the lock', async () => {
  await start()

  const lockRequest = vi.fn(
    (
      _name: string,
      _options: LockOptions,
      callback: LockGrantedCallback<unknown>
    ) => Promise.resolve(callback({ name: 'editor', mode: 'exclusive' }))
  )

  vi.stubGlobal('navigator', { locks: { request: lockRequest } })

  const takeover = persistence.takeOver()

  expect(channel.postMessage).toHaveBeenCalledWith({ type: 'flush' })
  expect(lockRequest).not.toHaveBeenCalled()
  channel.dispatchEvent(
    new MessageEvent('message', { data: { type: 'flushed' } })
  )
  await takeover
  expect(lockRequest).toHaveBeenCalledWith(
    expect.any(String),
    { steal: true },
    expect.any(Function)
  )
  expect(store.editor.state.access).toBe('editing')
})
