import { currentPage, editor } from './store'
import type { Renderer } from './renderer'

type Preview = {
  iframe: HTMLIFrameElement
  state: 'loading' | 'ready' | 'error'
  renderer?: Renderer
}

let preview: (() => Preview) | undefined

export function registerPreview(read: () => Preview) {
  preview = read

  return () => {
    if (preview === read) {
      preview = undefined
    }
  }
}

function imagesIn(root: ParentNode): Array<HTMLImageElement> {
  return [...root.querySelectorAll('*')].flatMap(el => [
    ...(el.localName === 'img' ? [el as HTMLImageElement] : []),
    ...(el.shadowRoot ? imagesIn(el.shadowRoot) : []),
  ])
}

export function inspectPreview() {
  const p = preview?.()
  const doc = p?.iframe.contentDocument
  const root = doc?.documentElement
  const width = root?.clientWidth ?? 0
  const height = root?.clientHeight ?? 0
  const images = doc
    ? imagesIn(doc).filter(img => {
        const r = img.getBoundingClientRect()

        return (
          r.width > 0 &&
          r.height > 0 &&
          (img.loading !== 'lazy' || (r.bottom > 0 && r.top < height))
        )
      })
    : []
  const pendingImages = images.filter(img => !img.complete).length
  const fontsReady = doc?.fonts.status === 'loaded'
  const resizing =
    p?.iframe.parentElement
      ?.getAnimations()
      .some(a => a.playState === 'running') ?? false
  const state = p?.state ?? 'unavailable'

  return {
    pageId: currentPage().id,
    viewport: editor.state.viewport,
    mode: editor.state.mode,
    state,
    ready:
      state === 'ready' &&
      width > 0 &&
      height > 0 &&
      fontsReady &&
      pendingImages === 0 &&
      !resizing,
    width,
    height,
    contentWidth: root?.scrollWidth ?? 0,
    contentHeight: root?.scrollHeight ?? 0,
    horizontalOverflow: (root?.scrollWidth ?? 0) > width + 1,
    fontsReady,
    pendingImages,
    failedImages: images.filter(img => img.complete && !img.naturalWidth)
      .length,
    resizing,
  }
}

export async function screenshotPreview(nodeId?: string) {
  const page = currentPage()
  const version = editor.state.doc.version
  const viewport = editor.state.viewport
  const mode = editor.state.mode
  const { snapdom } = await import('@zumer/snapdom')
  const deadline = Date.now() + 10_000
  let settled = false

  // Two settled observations let the frame paint after a store/viewport change.
  for (;;) {
    const status = inspectPreview()

    if (status.state === 'unavailable' || status.state === 'error') {
      throw new Error('The Polaris preview is unavailable or failed to load.')
    }

    if (status.ready && settled) {
      break
    }

    if (Date.now() >= deadline) {
      throw new Error(
        'The preview did not finish loading within 10 seconds. Call inspect_preview for details.'
      )
    }

    settled = status.ready
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  const p = preview!()
  const doc = p.iframe.contentDocument!
  const win = doc.defaultView!
  const rect = nodeId ? p.renderer?.rect(nodeId) : undefined

  if (nodeId && (!rect || rect.width <= 0 || rect.height <= 0)) {
    throw new Error(
      'The component has no rendered bounds. Open its overlay or choose a visible component.'
    )
  }

  const clip = rect
    ? {
        x: rect.left + win.scrollX,
        y: rect.top + win.scrollY,
        width: Math.ceil(rect.width),
        height: Math.ceil(rect.height),
      }
    : {
        x: win.scrollX,
        y: win.scrollY,
        width: doc.documentElement.clientWidth,
        height: doc.documentElement.clientHeight,
      }

  if (clip.width * clip.height > 16_000_000) {
    throw new Error(
      'The capture exceeds 16 megapixels. Capture the viewport or a smaller component.'
    )
  }

  const unchanged = () =>
    currentPage() === page &&
    editor.state.doc.version === version &&
    editor.state.viewport === viewport &&
    editor.state.mode === mode &&
    preview?.().iframe.contentDocument === doc

  if (!unchanged()) {
    throw new Error('The preview changed during capture. Retry the screenshot.')
  }

  const capture = await snapdom(doc.documentElement, {
    clip,
    dpr: 1,
    embedFonts: true,
    reconcile: true,
    exclude: 'pg-overlay, .pg-empty',
    excludeMode: 'hide',
  })
  const canvas = await capture.toCanvas()

  if (!unchanged()) {
    throw new Error('The preview changed during capture. Retry the screenshot.')
  }

  return {
    pageId: page.id,
    pageName: page.name,
    nodeId,
    viewport,
    width: canvas.width,
    height: canvas.height,
    warnings: capture.warnings,
    data: canvas.toDataURL('image/png').split(',')[1]!,
  }
}
