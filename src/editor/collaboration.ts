import * as Y from 'yjs'
import { openDatabase, requested, committed } from './persistence'
import { SharedDocument } from './shared'
import {
  editor,
  refreshShared,
  setRoom,
  setSaveState,
  snapshotOf,
} from './store'
import type { Snapshot } from './store'

type SavedRoom = Pick<Snapshot, 'pageId' | 'viewport' | 'presets'> & {
  update: Uint8Array
}

const empty: Snapshot = {
  version: 'v1',
  pages: [],
  pageId: '',
  viewport: 'desktop',
  presets: [],
}

export function roomId() {
  const id = new URLSearchParams(location.search).get('room')

  if (id && !/^[0-9a-f-]{36}$/.test(id)) {
    throw new Error('Invalid collaboration link.')
  }

  return id
}

export function roomUrl(id: string) {
  const url = new URL('/builder', location.href)

  url.searchParams.set('room', id)

  return url.href
}

const openRoomDatabase = (id: string) =>
  openDatabase(`polaris-playground-room:${id}`, 1, db =>
    db.createObjectStore('state')
  )

async function save(
  db: IDBDatabase,
  shared: SharedDocument,
  snapshot: Snapshot
) {
  const tx = db.transaction('state', 'readwrite')
  const done = committed(tx)
  const store = tx.objectStore('state')
  const previous = store.get('workspace')

  previous.onsuccess = () => {
    const stored = previous.result as SavedRoom | undefined
    const update = Y.encodeStateAsUpdate(shared.doc)

    // Merge inside the transaction: two local tabs cannot overwrite each other's saved edits.
    store.put(
      {
        update: stored ? Y.mergeUpdates([stored.update, update]) : update,
        pageId: snapshot.pageId,
        viewport: snapshot.viewport,
        presets: snapshot.presets,
      } satisfies SavedRoom,
      'workspace'
    )
  }

  await done
}

export async function createRoom(snapshot = snapshotOf()) {
  const id = crypto.randomUUID()
  const shared = new SharedDocument()
  const db = await openRoomDatabase(id)

  try {
    shared.write(
      { version: snapshot.version, pages: [] },
      { version: snapshot.version, pages: snapshot.pages }
    )
    await save(db, shared, snapshot)

    return roomUrl(id)
  } finally {
    db.close()
    shared.doc.destroy()
  }
}

export function joinRoom(id: string) {
  const shared = new SharedDocument()
  let db: IDBDatabase | undefined
  let socket: WebSocket | undefined
  const stop = new AbortController()
  let retry: ReturnType<typeof setTimeout> | undefined
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  let heartbeat: ReturnType<typeof setInterval> | undefined
  let awaitingPong = false
  let retryDelay = 500
  let local = empty
  let queue = Promise.resolve()
  let resolve!: (value: Snapshot) => void
  let reject!: (error: unknown) => void
  const workspace = new Promise<Snapshot>((ok, fail) => {
    resolve = ok
    reject = fail
  })
  const status = (
    state: NonNullable<typeof editor.state.room>['status'],
    error?: string
  ) => {
    setRoom({
      id,
      status: state,
      peers: state === 'connected' ? (editor.state.room?.peers ?? 1) : 0,
      error,
    })
  }

  status('connecting')

  const flush = () => {
    clearTimeout(saveTimer)

    if (!db || !shared.read()) {
      return queue
    }

    const snapshot = editor.state.shared === shared ? snapshotOf() : local

    queue = queue
      .then(() => save(db!, shared, snapshot))
      .then(
        () => {
          setSaveState('saved')
        },
        () => {
          setSaveState('error')
        }
      )

    return queue
  }
  const scheduleSave = () => {
    setSaveState('saving')
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => void flush(), 400)
  }
  const publish = () => {
    const doc = shared.read()

    if (!doc) {
      return
    }

    local = { ...local, ...doc, pageId: local.pageId || doc.pages[0]!.id }
    resolve(local)

    if (editor.state.shared === shared) {
      refreshShared(shared)
    }
  }
  const send = (type: number, data: Uint8Array) => {
    if (socket?.readyState !== WebSocket.OPEN) {
      return
    }

    if (data.length + 1 > 1_048_576) {
      status(
        'error',
        'This room exceeds the 1 MB sync limit. Export your pages to keep a copy.'
      )
      socket.close(1009)

      return
    }

    const packet = new Uint8Array(data.length + 1)

    packet[0] = type
    packet.set(data, 1)
    socket.send(packet)
  }
  const onUpdate = (update: Uint8Array, origin: unknown) => {
    publish()
    scheduleSave()

    if (origin !== 'network') {
      send(1, update)
    }
  }

  shared.doc.on('update', onUpdate)

  const connect = () => {
    if (stop.signal.aborted) {
      return
    }

    status('connecting')

    const url = new URL(`/api/rooms/${id}`, location.href)

    url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    socket = new WebSocket(url)
    socket.binaryType = 'arraybuffer'

    socket.onopen = () => {
      retryDelay = 500
      status('connected')
      send(0, Y.encodeStateVector(shared.doc))
      awaitingPong = false
      heartbeat = setInterval(() => {
        if (awaitingPong) {
          socket?.close()
        } else {
          awaitingPong = true
          socket?.send('ping')
        }
      }, 25_000)
    }

    socket.onmessage = event => {
      try {
        if (event.data === 'pong') {
          awaitingPong = false

          return
        }

        if (event.data === 'sync') {
          send(0, Y.encodeStateVector(shared.doc))

          return
        }

        if (typeof event.data === 'string') {
          const { peers } = JSON.parse(event.data)

          if (Number.isInteger(peers) && peers > 0 && peers <= 16) {
            setRoom({ id, status: 'connected', peers })
          }

          return
        }

        const packet = new Uint8Array(event.data as ArrayBuffer)

        if (packet.length < 2 || packet.length > 1_048_576) {
          throw new Error('Invalid room message')
        }

        if (packet[0] === 0) {
          send(1, Y.encodeStateAsUpdate(shared.doc, packet.subarray(1)))
        } else if (packet[0] === 1) {
          Y.applyUpdate(shared.doc, packet.subarray(1), 'network')
        } else {
          throw new Error('Unknown room message')
        }
      } catch {
        status(
          'error',
          'Could not read an update from this room. Reload to reconnect.'
        )
        socket?.close(1008)
      }
    }

    socket.onclose = () => {
      clearInterval(heartbeat)

      if (stop.signal.aborted || editor.state.room?.status === 'error') {
        return
      }

      status('offline')
      retry = setTimeout(connect, retryDelay)
      retryDelay = Math.min(retryDelay * 2, 10_000)
    }

    socket.onerror = () => socket?.close()
  }

  void (async () => {
    db = await openRoomDatabase(id)

    const saved = await requested<SavedRoom | undefined>(
      db.transaction('state').objectStore('state').get('workspace')
    )

    if (stop.signal.aborted) {
      db.close()

      return
    }

    if (saved) {
      local = { ...empty, ...saved }
      Y.applyUpdate(shared.doc, saved.update, 'network')
    }

    publish()
    connect()
  })().catch(error => {
    status(
      'error',
      'Local room storage is unavailable. Allow browser storage and reload.'
    )
    reject(error)
  })

  const subscription = editor.subscribe(state => {
    if (state.shared !== shared) {
      return
    }

    if (
      state.pageId !== local.pageId ||
      state.viewport !== local.viewport ||
      state.presets !== local.presets
    ) {
      local = snapshotOf(state)
      scheduleSave()
    }
  })
  const onHide = () => {
    void flush()
  }

  addEventListener('pagehide', onHide)
  document.addEventListener('visibilitychange', onHide)

  return {
    shared,
    workspace,
    async close(saveRequired = false) {
      if (stop.signal.aborted) {
        return
      }

      await flush()

      if (saveRequired && editor.state.saveState === 'error') {
        throw new Error(
          'Could not save this room. Export your pages before leaving, or try again.'
        )
      }

      stop.abort()
      clearTimeout(retry)
      clearInterval(heartbeat)
      socket?.close()
      subscription.unsubscribe()
      removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onHide)
      clearTimeout(saveTimer)
      shared.doc.destroy()
      db?.close()
    },
  }
}
