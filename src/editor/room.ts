// Room links, kept apart from collaboration.ts so reading one doesn't load Yjs.

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
