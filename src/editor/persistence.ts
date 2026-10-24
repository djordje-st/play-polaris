import {
  DEFAULT_PROJECT,
  applySnapshot,
  canEdit,
  editor,
  newProject,
  setAccess,
  setSaveState,
  snapshotOf,
  workspaceOf,
} from './store'
import { uid } from './model'
import type { Page, Version } from './model'
import type { Preset, Project, Snapshot, Viewport } from './store'

// Separate rows let saves write only changed pages, components and projects.

type Meta = {
  id: 'workspace'
  projectId: string
  viewport: Viewport
}

// Before projects, the workspace row held the only project's page list.
type OldMeta = Partial<Meta> & {
  version?: Version
  pageOrder?: Array<string>
  pageId?: string
}

type ProjectRow = Omit<Project, 'pages'> & { pageOrder: Array<string> }

const DB_NAME = 'polaris-playground-data'
// Dexie created this database and stored its schema version 1 as IndexedDB
// version 10. Version 11 adds the projects store.
const DB_VERSION = 11
const STORES = ['pages', 'presets', 'meta', 'projects']

export const requested = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

export const committed = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = tx.onabort = () =>
      reject(tx.error ?? new Error('The transaction was aborted'))
  })

export function openDatabase(
  name: string,
  version?: number,
  upgrade?: (db: IDBDatabase) => void
) {
  const request = indexedDB.open(name, version)

  request.onupgradeneeded = () => upgrade?.(request.result)

  return requested(request)
}

let connection: Promise<IDBDatabase> | undefined

const db = () =>
  (connection ??= openDatabase(DB_NAME, DB_VERSION, created => {
    for (const store of STORES) {
      if (!created.objectStoreNames.contains(store)) {
        created.createObjectStore(store, { keyPath: 'id' })
      }
    }
  }).then(
    opened => {
      opened.onversionchange = () => {
        opened.close()
        connection = undefined
      }

      return opened
    },
    (error: unknown) => {
      // Storage can be blocked for a moment; let the next call try again.
      connection = undefined

      throw error
    }
  ))

const LEGACY_DB = 'polaris-playground'

type LegacyRecord = {
  doc: { version: Version; pages: Array<Page> }
  pageId: string
  viewport: Viewport
  presets?: Array<Preset>
}

async function migrateLegacy() {
  const tx = (await db()).transaction('meta')

  if (await requested(tx.objectStore('meta').count())) {
    return
  }

  // Only databases() can tell whether it exists: opening would create it.
  const existing = 'databases' in indexedDB ? await indexedDB.databases() : []

  if (!existing.some(d => d.name === LEGACY_DB)) {
    return
  }

  const legacy = await openDatabase(LEGACY_DB)
  const record = await requested<LegacyRecord | undefined>(
    legacy.transaction('kv').objectStore('kv').get('workspace')
  )

  legacy.close()

  if (record) {
    await write(
      workspaceOf(
        {
          ...newProject(DEFAULT_PROJECT, record.doc.version, record.doc.pages),
          pageId: record.pageId,
        },
        record.viewport,
        record.presets ?? []
      )
    )
  }

  // Not awaited: a tab still running the first release would hold it open.
  indexedDB.deleteDatabase(LEGACY_DB)
}

async function read(): Promise<Snapshot | null> {
  const tx = (await db()).transaction(STORES)
  const meta = await requested<OldMeta | undefined>(
    tx.objectStore('meta').get('workspace')
  )

  if (!meta) {
    return null
  }

  const pageStore = tx.objectStore('pages')
  const [rows, presets] = await Promise.all([
    requested<Array<ProjectRow>>(tx.objectStore('projects').getAll()),
    requested<Array<Preset>>(tx.objectStore('presets').getAll()),
  ])

  // The first save after the upgrade stores this as a regular project.
  if (!rows.length) {
    rows.push({
      id: 'default',
      name: DEFAULT_PROJECT,
      version: meta.version ?? 'v2',
      pageOrder: meta.pageOrder ?? [],
      pageId: meta.pageId ?? '',
      createdAt: 0,
      updatedAt: 0,
    })
  }

  const projects = await Promise.all(
    rows
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(async ({ pageOrder, ...row }): Promise<Project> => {
        const found = await Promise.all(
          pageOrder.map(id => requested<Page | undefined>(pageStore.get(id)))
        )
        const pages = found.filter((p): p is Page => !!p)

        // A project must have a page to open; missing rows leave a blank one.
        return {
          ...row,
          pages: pages.length
            ? pages
            : [{ id: uid(), name: 'Home', nodes: [] }],
        }
      })
  )
  const open = projects.find(p => p.id === meta.projectId) ?? projects[0]!

  return {
    version: open.version,
    pages: open.pages,
    pageId: open.pageId,
    viewport: meta.viewport ?? 'desktop',
    presets: presets.sort((a, b) => a.createdAt - b.createdAt),
    projectId: open.id,
    projects,
  }
}

export async function loadWorkspace() {
  await migrateLegacy()

  return read()
}

// Immutable rows make reference equality sufficient for change detection.

type Written = {
  pages: Map<string, Page>
  presets: Map<string, Preset>
  projects: Map<string, Project>
  meta: string
}

let written: Written | null = null
let queue: Promise<void> = Promise.resolve()

export function purgeWorkspace() {
  const purge = queue.then(async () => {
    if (!canEdit() || !unsubscribeSaves) {
      throw new Error('Switch to the editing tab to clear local data.')
    }

    // Remove the old format too, so it cannot be migrated back later.
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(LEGACY_DB)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
      request.onblocked = () =>
        reject(new Error('Close other Playground tabs and try again.'))
    })

    if (!canEdit()) {
      throw new Error('Switch to the editing tab to clear local data.')
    }

    const fresh = workspaceOf(
      newProject(DEFAULT_PROJECT, 'v2', [
        { id: uid(), name: 'Home', nodes: [] },
      ])
    )

    // A full write removes every old row and installs a blank workspace in
    // one transaction. Queued autosaves then see only the fresh snapshot.
    await write(fresh)
    applySnapshot(fresh)
    written = remember(fresh)
    clearTimeout(saveTimer)
    setSaveState('saved')
    post({ type: 'saved' })
  })

  // Let the caller report errors without poisoning subsequent autosaves.
  queue = purge.catch(() => {})

  return purge
}

const metaOf = (s: Snapshot): Meta => ({
  id: 'workspace',
  projectId: s.projectId ?? '',
  viewport: s.viewport,
})

const rowOf = ({ pages, ...project }: Project): ProjectRow => ({
  ...project,
  pageOrder: pages.map(p => p.id),
})

const byId = <T extends { id: string }>(rows: Array<T>) =>
  new Map(rows.map(r => [r.id, r]))

const remember = (s: Snapshot): Written => ({
  pages: byId((s.projects ?? []).flatMap(p => p.pages)),
  presets: byId(s.presets),
  projects: byId(s.projects ?? []),
  meta: JSON.stringify(metaOf(s)),
})

const same = <T>(a: Map<string, T>, b: Map<string, T>) =>
  a.size === b.size && [...a].every(([id, row]) => b.get(id) === row)

function syncRows<T extends { id: string }>(
  store: IDBObjectStore,
  rows: Array<T>,
  before?: Map<string, T>,
  toRow: (row: T) => unknown = row => row
) {
  for (const row of rows) {
    if (before?.get(row.id) !== row) {
      store.put(toRow(row))
    }
  }

  const keep = new Set(rows.map(r => r.id))
  const prune = (ids: Iterable<IDBValidKey>) => {
    for (const id of ids) {
      if (!keep.has(id as string)) {
        store.delete(id)
      }
    }
  }

  if (before) {
    prune(before.keys())
  } else {
    const all = store.getAllKeys()

    all.onsuccess = () => prune(all.result)
  }
}

async function write(s: Snapshot, prev: Written | null = null) {
  const tx = (await db()).transaction(STORES, 'readwrite')
  const saved = committed(tx)

  try {
    const projects = s.projects ?? []

    syncRows(
      tx.objectStore('pages'),
      projects.flatMap(p => p.pages),
      prev?.pages
    )
    syncRows(tx.objectStore('presets'), s.presets, prev?.presets)
    syncRows(tx.objectStore('projects'), projects, prev?.projects, rowOf)

    const meta = metaOf(s)

    if (JSON.stringify(meta) !== prev?.meta) {
      tx.objectStore('meta').put(meta)
    }
  } catch (error) {
    tx.abort()
    saved.catch(() => {})

    throw error
  }

  return saved
}

// Serialize saves so an older snapshot cannot overwrite a newer one.
function flush() {
  if (!unsubscribeSaves) {
    return queue
  }

  queue = queue.then(async () => {
    const s = snapshotOf()
    const next = remember(s)
    const prev = written

    if (
      prev &&
      next.meta === prev.meta &&
      same(next.pages, prev.pages) &&
      same(next.presets, prev.presets) &&
      same(next.projects, prev.projects)
    ) {
      setSaveState('saved')

      return
    }

    try {
      await write(s, prev)

      written = next

      setSaveState('saved')
      post({ type: 'saved' })
    } catch (e) {
      console.error('Saving the workspace failed', e)
      setSaveState('error')
    }
  })

  return queue
}

let saveTimer: ReturnType<typeof setTimeout> | undefined
let unsubscribeSaves: (() => void) | null = null

function startSaving() {
  // Force a full first save so other tabs can read a newly created workspace.

  written = null

  let last = snapshotOf()
  const sub = editor.subscribe(state => {
    const s = snapshotOf(state)

    if (
      s.pages === last.pages &&
      s.presets === last.presets &&
      s.version === last.version &&
      s.pageId === last.pageId &&
      s.viewport === last.viewport &&
      s.projects === last.projects &&
      s.projectId === last.projectId
    ) {
      return
    }

    last = s

    setSaveState('saving')
    clearTimeout(saveTimer)

    saveTimer = setTimeout(() => void flush(), 400)
  })

  unsubscribeSaves = () => {
    sub.unsubscribe()
    clearTimeout(saveTimer)
  }

  void flush()
}

function stopSaving() {
  unsubscribeSaves?.()
  unsubscribeSaves = null
}

// Only the lock holder writes; other tabs mirror saved state to avoid lost updates.

const LOCK = 'polaris-playground:editor'

type Message = { type: 'saved' | 'flush' | 'flushed' }

const channel =
  typeof BroadcastChannel === 'undefined'
    ? null
    : new BroadcastChannel('polaris-playground')

const post = (message: Message) => channel?.postMessage(message)

let waiting: AbortController | null = null
let watching = false

const mirror = () =>
  read().then(
    snap => snap && applySnapshot(snap),
    (e: unknown) => console.error('Watching the workspace failed', e)
  )

function acquire(options: LockOptions) {
  return new Promise<boolean>(resolve => {
    let held = false

    navigator.locks
      .request(LOCK, options, lock => {
        if (!lock) {
          return resolve(false)
        }

        held = true
        resolve(true)

        return new Promise<void>(() => {})
      })
      .catch(() => {
        // Before the grant: our wait was aborted. After: another tab took over.
        if (held) {
          becomeViewer()
        }

        resolve(false)
      })
  })
}

function becomeEditor() {
  watching = false
  waiting?.abort()
  waiting = null

  setAccess('editing')
  startSaving()
}

function becomeViewer() {
  stopSaving()
  setAccess('viewing')
  watching = true
  void mirror()

  waiting = new AbortController()

  void acquire({ signal: waiting.signal }).then(async ok => {
    if (!ok) {
      return
    }

    const snap = await read()

    if (snap) {
      applySnapshot(snap)
    }

    becomeEditor()
  })
}

export async function startSession() {
  addEventListener('pagehide', () => void flush())

  // Flush before the tab is hidden too: the other tab may take over next.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      void flush()
    }
  })

  channel?.addEventListener('message', (e: MessageEvent<Message>) => {
    if (e.data.type === 'flush' && unsubscribeSaves) {
      void flush().then(() => post({ type: 'flushed' }))
    }

    if (e.data.type === 'saved' && watching) {
      void mirror()
    }
  })

  if (!('locks' in navigator)) {
    return becomeEditor()
  }

  if (await acquire({ ifAvailable: true })) {
    becomeEditor()
  } else {
    becomeViewer()
  }
}

export async function takeOver() {
  await new Promise<void>(resolve => {
    const timer = setTimeout(resolve, 1000)
    const onMessage = (e: MessageEvent<Message>) => {
      if (e.data.type !== 'flushed') {
        return
      }

      clearTimeout(timer)
      channel?.removeEventListener('message', onMessage)
      resolve()
    }

    channel?.addEventListener('message', onMessage)

    post({ type: 'flush' })
  })

  waiting?.abort()
  waiting = null

  if (!(await acquire({ steal: true }))) {
    return
  }

  const snap = await read()

  if (snap) {
    applySnapshot(snap)
  }

  becomeEditor()
}
