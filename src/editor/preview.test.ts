// @vitest-environment happy-dom

import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { snapdom } from '@zumer/snapdom'
import { resetEditor } from '../test/editor'
import { createRenderer } from './renderer'
import { inspectPreview, registerPreview, screenshotPreview } from './preview'
import { currentPage, editor, select, setText, setViewport } from './store'

vi.mock('@zumer/snapdom', () => ({ snapdom: vi.fn() }))

let off: (() => void) | undefined

beforeEach(() => {
  resetEditor('<s-button>Capture me</s-button>')
  vi.useFakeTimers()

  const canvas = document.createElement('canvas')

  canvas.width = 390
  canvas.height = 640
  vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:image/png;base64,cG5n')
  vi.mocked(snapdom).mockResolvedValue({
    toCanvas: async () => canvas,
    warnings: [],
  } as unknown as Awaited<ReturnType<typeof snapdom>>)
})

afterEach(() => {
  off?.()
  off = undefined
  document.body.replaceChildren()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

function frame() {
  const holder = document.createElement('div')
  const iframe = document.createElement('iframe')

  holder.append(iframe)
  document.body.append(holder)

  const doc = iframe.contentDocument!
  const fonts = { status: 'loaded' }

  Object.defineProperty(doc, 'fonts', { value: fonts, configurable: true })
  Object.defineProperties(doc.documentElement, {
    clientWidth: { value: 390, configurable: true },
    clientHeight: { value: 640, configurable: true },
    scrollWidth: { value: 390, configurable: true },
    scrollHeight: { value: 800, configurable: true },
  })
  holder.getAnimations = vi.fn(() => [])

  const renderer = createRenderer(doc)

  renderer.render(currentPage().nodes, editor.state.catalog!)

  const context = {
    iframe,
    renderer,
    state: 'ready' as 'ready' | 'loading' | 'error',
  }

  off = registerPreview(() => context)

  return { context, doc, fonts, holder }
}

test('inspection reports geometry, resource readiness, shadow images and resize state', () => {
  expect(inspectPreview()).toMatchObject({ state: 'unavailable', ready: false })

  const { doc, fonts, holder } = frame()

  expect(inspectPreview()).toMatchObject({
    ready: true,
    width: 390,
    contentHeight: 800,
    horizontalOverflow: false,
  })

  const root = doc.querySelector('s-button')!.attachShadow({ mode: 'open' })
  const img = doc.createElement('img')

  root.append(img)
  vi.spyOn(img, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, 50, 50)
  )
  Object.defineProperty(img, 'complete', { value: false, configurable: true })
  fonts.status = 'loading'
  Object.defineProperty(doc.documentElement, 'scrollWidth', { value: 500 })
  expect(inspectPreview()).toMatchObject({
    ready: false,
    fontsReady: false,
    pendingImages: 1,
    horizontalOverflow: true,
  })
  fonts.status = 'loaded'
  Object.defineProperty(img, 'complete', { value: true })
  expect(inspectPreview()).toMatchObject({ ready: true, failedImages: 1 })
  img.loading = 'lazy'
  vi.spyOn(img, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 900, 50, 50)
  )
  expect(inspectPreview().failedImages).toBe(0)
  holder.getAnimations = () => [{ playState: 'running' } as Animation]
  expect(inspectPreview()).toMatchObject({ ready: false, resizing: true })
  holder.getAnimations = () => [{ playState: 'finished' } as Animation]
  expect(inspectPreview().ready).toBe(true)
})

test('captures viewport or component bounds without changing selection, mode or scroll', async () => {
  const { context, doc } = frame()
  const id = currentPage().nodes[0]!.id

  select(id)
  vi.spyOn(doc.defaultView!, 'scrollX', 'get').mockReturnValue(10)
  vi.spyOn(doc.defaultView!, 'scrollY', 'get').mockReturnValue(30)

  const before = editor.state
  const capture = screenshotPreview()

  await vi.advanceTimersByTimeAsync(100)
  expect(await capture).toMatchObject({
    pageName: 'Test page',
    width: 390,
    height: 640,
    data: 'cG5n',
  })
  expect(snapdom).toHaveBeenLastCalledWith(
    doc.documentElement,
    expect.objectContaining({
      clip: { x: 10, y: 30, width: 390, height: 640 },
      exclude: 'pg-overlay, .pg-empty',
      reconcile: true,
    })
  )
  expect(editor.state).toBe(before)
  expect(doc.defaultView!.scrollY).toBe(30)
  vi.spyOn(context.renderer, 'rect').mockReturnValue(
    new DOMRect(20, 40, 100.5, 25.5)
  )

  const crop = screenshotPreview(id)

  await vi.advanceTimersByTimeAsync(100)
  await crop
  expect(snapdom).toHaveBeenLastCalledWith(
    doc.documentElement,
    expect.objectContaining({ clip: { x: 30, y: 70, width: 101, height: 26 } })
  )
})

test('waits for readiness, times out stalled loading and rejects missing previews', async () => {
  await expect(screenshotPreview()).rejects.toThrow('unavailable')

  const { context } = frame()

  context.state = 'loading'

  const loading = screenshotPreview()

  await vi.advanceTimersByTimeAsync(100)
  context.state = 'ready'
  await vi.advanceTimersByTimeAsync(100)
  await expect(loading).resolves.toMatchObject({ data: 'cG5n' })
  context.state = 'loading'

  const stalled = expect(screenshotPreview()).rejects.toThrow('10 seconds')

  await vi.advanceTimersByTimeAsync(10_100)
  await stalled
  context.state = 'error'
  await expect(screenshotPreview()).rejects.toThrow('failed to load')
})

test('rejects hidden or oversized crops and changes made while waiting or capturing', async () => {
  const { context } = frame()
  const rect = vi.spyOn(context.renderer, 'rect')

  for (const bounds of [
    null,
    new DOMRect(0, 0, 0, 20),
    new DOMRect(0, 0, 20, 0),
    new DOMRect(0, 0, 5000, 5000),
  ]) {
    rect.mockReturnValue(bounds)

    const failure = expect(screenshotPreview('node')).rejects.toThrow(
      bounds?.width === 5000 ? '16 megapixels' : 'no rendered bounds'
    )

    await vi.advanceTimersByTimeAsync(100)
    await failure
  }

  const changed = expect(screenshotPreview()).rejects.toThrow(
    'changed during capture'
  )

  setViewport('mobile')
  await vi.advanceTimersByTimeAsync(100)
  await changed
  vi.mocked(snapdom).mockImplementationOnce(async () => {
    setText(currentPage().nodes[0]!.id, 'Changed')

    return {
      toCanvas: async () => document.createElement('canvas'),
    } as unknown as Awaited<ReturnType<typeof snapdom>>
  })

  const edited = expect(screenshotPreview()).rejects.toThrow(
    'changed during capture'
  )

  await vi.advanceTimersByTimeAsync(100)
  await edited
})

test('stale frame cleanup cannot unregister a newer frame', () => {
  const { context } = frame()
  const cleanup = off!

  off = registerPreview(() => context)
  cleanup()
  expect(inspectPreview().state).toBe('ready')
  off()
  expect(inspectPreview().state).toBe('unavailable')
})
