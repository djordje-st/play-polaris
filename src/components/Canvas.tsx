import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
} from 'solid-js'
import { useSelector } from '@tanstack/solid-store'
import { Draggable } from '@dnd-kit/dom'
import { useDragDropManager } from '@dnd-kit/solid'
import { POLARIS_SCRIPT, VERSION_LABEL, displayName } from '../polaris/catalog'
import { isContainer, validate } from '../polaris/rules'
import { TEMPLATES } from '../polaris/library'
import {
  forgivingTarget,
  isHorizontal,
  registerCanvasHit,
  rootTarget,
  targetAt,
} from '../editor/dnd'
import { isText, locate, pathTo, slotOf } from '../editor/model'
import { createRenderer } from '../editor/renderer'
import { registerPreview } from '../editor/preview'
import {
  closeInsert,
  currentPage,
  duplicate,
  editor,
  fromTemplate,
  hover,
  notify,
  openInsert,
  remove,
  replacePage,
  select,
} from '../editor/store'
import { handleShortcut, modKey } from '../editor/shortcuts'
import { Button, Icon, PATHS } from './ui'
import type { DragData } from '../editor/dnd'
import type { ElementNode, TreeNode, Version } from '../editor/model'
import type { Renderer } from '../editor/renderer'
import type { State } from '../editor/store'

const VIEWPORT_WIDTH = { desktop: '100%', tablet: '834px', mobile: '390px' }

const FRAME_CSS = `
html { color-scheme: light; }
html, body { margin: 0; min-height: 100%; background: #f1f1f1; }
body { min-height: 100vh; padding-bottom: 48px; box-sizing: border-box; }
.pg-empty {
  box-sizing: border-box; min-height: 52px; padding: 12px; display: flex; align-items: center; justify-content: center;
  border: 1px dashed #aeb4bf; border-radius: 8px; background: rgb(255 255 255 / .6);
  color: #6b7280; font: 12px/1.4 system-ui, sans-serif; text-align: center;
}
body.pg-interact .pg-empty { display: none; }
`

const OVERLAY_CSS = `
:host { position: fixed; inset: 0; width: auto; height: auto; margin: 0; padding: 0; border: 0;
  background: transparent; overflow: visible; pointer-events: none; color-scheme: light; }
.box { position: absolute; display: none; box-sizing: border-box; border-radius: 4px; }
.hover { border: 1px solid rgb(47 91 255 / .5); background: rgb(47 91 255 / .03); }
.sel { border: 1.5px solid #2f5bff; }
.drop.line { background: #2f5bff; border-radius: 2px; box-shadow: 0 0 0 1.5px #fff; }
.drop.area { border: 2px solid #2f5bff; background: rgb(47 91 255 / .06); }
.drop.bad.line { background: #d23b40; }
.drop.bad.area { border-color: #d23b40; background: rgb(210 59 64 / .06); }
.tag { position: absolute; left: -1.5px; bottom: 100%; margin-bottom: 3px; padding: 0 6px; max-width: 320px;
  font: 500 11px/18px Inter, system-ui, sans-serif; color: #fff; background: #2f5bff;
  border-radius: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tag:empty { display: none; }
.tag.in { bottom: auto; top: 3px; left: 3px; margin: 0; }
.tag i { font-style: normal; opacity: .72; margin-left: 6px; }
.bad .tag { background: #d23b40; white-space: normal; }
.actions { position: absolute; display: none; gap: 1px; padding: 2px; background: #fff;
  border: 1px solid #cfd3da; border-radius: 6px; box-shadow: 0 2px 8px rgb(16 24 40 / .14); pointer-events: auto; }
.actions button { all: unset; box-sizing: border-box; display: grid; place-items: center; width: 22px; height: 22px;
  border-radius: 4px; color: #4c5361; cursor: pointer; }
.actions button:hover { background: #eef0f3; color: #1d2129; }
.actions button.danger:hover { background: #fdeeee; color: #d23b40; }
.actions .sep { width: 1px; margin: 3px 2px; background: #e4e6ea; }
.actions svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.4;
  stroke-linecap: round; stroke-linejoin: round; }
`

const frameDocument = (version: Version) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><script src="${POLARIS_SCRIPT[version]}"></script><style>${FRAME_CSS}</style></head><body class="pg-design"></body></html>`

type Box = { left: number; top: number; width: number; height: number }

// Reveal selected overlays so their contents can be edited in design mode.

const OVERLAYS = new Set(['s-modal', 's-popover', 's-menu', 's-tooltip'])

function showOverlay(doc: Document, el: Element) {
  if (el.localName === 's-modal') {
    return (el as HTMLElementTagNameMap['s-modal']).showOverlay()
  }

  const trigger = el.id
    ? doc.querySelector<HTMLElement>(`[commandfor="${CSS.escape(el.id)}"]`)
    : null
  const pop = el.shadowRoot?.querySelector<HTMLElement>('[popover]')

  if (pop?.matches(':popover-open')) {
    return
  }

  // Synthetic clicks pass the design-mode filter, which only blocks real input.
  if (trigger) {
    trigger.click()
  } else {
    pop?.showPopover()
  }
}

function hideOverlay(el: Element) {
  if (el.localName === 's-modal') {
    return (el as HTMLElementTagNameMap['s-modal']).hideOverlay()
  }

  const pop = el.shadowRoot?.querySelector<HTMLElement>('[popover]')

  if (pop?.matches(':popover-open')) {
    pop.hidePopover()
  }
}

export function Canvas() {
  const version = useSelector(editor, s => s.doc.version)
  const viewport = useSelector(editor, s => s.viewport)
  const empty = useSelector(editor, s => currentPage(s).nodes.length === 0)

  return (
    <div class="flex min-h-0 min-w-0 flex-1 flex-col">
      <div
        data-canvas
        class="drafting relative flex min-h-0 flex-1 justify-center overflow-hidden p-4"
      >
        <div
          class="relative h-full max-w-full overflow-hidden rounded-[10px] border border-line-strong bg-[#f1f1f1] shadow-[0_1px_2px_rgb(16_24_40/0.06),0_12px_32px_-12px_rgb(16_24_40/0.18)] transition-[width] duration-300 ease-out"
          style={{ width: VIEWPORT_WIDTH[viewport()] }}
        >
          <Show
            when={version()}
            keyed
          >
            {v => <Frame version={v} />}
          </Show>

          <Show when={empty()}>
            <EmptyPage />
          </Show>
        </div>
      </div>

      <StatusBar />
    </div>
  )
}

function Frame(props: { version: Version }) {
  let iframe!: HTMLIFrameElement
  const [state, setState] = createSignal<'loading' | 'ready' | 'error'>(
    'loading'
  )
  const [ctx, setCtx] = createSignal<{
    doc: Document
    win: Window
    renderer: Renderer
    overlay: HTMLElement
  }>()
  const nodes = useSelector(editor, s => currentPage(s).nodes)
  const catalog = useSelector(editor, s => s.catalog)
  const mode = useSelector(editor, s => s.mode)
  const selectedId = useSelector(editor, s => s.selectedId)
  const pageId = useSelector(editor, s => s.pageId)
  const manager = useDragDropManager()

  onCleanup(
    registerPreview(() => ({
      iframe,
      state: state(),
      renderer: ctx()?.renderer,
    }))
  )

  let cleanups: Array<() => void> = []
  let selectedFromCanvas = false

  let pointerInFrame = false
  let actionsRect: {
    left: number
    top: number
    right: number
    bottom: number
  } | null = null

  const offset = () => {
    const r = iframe.getBoundingClientRect()

    return { x: r.left, y: r.top }
  }

  function onLoad() {
    const doc = iframe.contentDocument
    const win = iframe.contentWindow

    if (!doc || !win) {
      return
    }

    if (!win.customElements.get('s-page')) {
      setState('error')

      return
    }

    const renderer = createRenderer(doc)
    // Share one draggable across the iframe; the press chooses which node it carries.

    const dragSource = manager
      ? new Draggable<DragData>(
          { id: 'canvas', element: doc.body, disabled: true },
          manager
        )
      : null
    const overlay = mountOverlay(doc, win, renderer)

    cleanups.push(listen(doc, win, renderer, overlay, dragSource), () =>
      dragSource?.destroy()
    )
    setCtx({ doc, win, renderer, overlay })
    setState('ready')
  }

  function listen(
    doc: Document,
    win: Window,
    renderer: Renderer,
    overlay: HTMLElement,
    dragSource: Draggable<DragData> | null
  ) {
    // The overlay's action toolbar is ours, so its events skip the design-mode filter.
    const fromOverlay = (e: Event) => e.composedPath().includes(overlay)
    const design = (e: Event) =>
      e.isTrusted && editor.state.mode === 'design' && !fromOverlay(e)
    const swallow = (e: Event) => {
      if (!design(e)) {
        return
      }

      e.preventDefault()
      e.stopImmediatePropagation()
    }
    const onPointerDown = (e: PointerEvent) => {
      const inDesign = design(e)
      const press = inDesign && e.button === 0
      const hit = press ? renderer.hit(e.clientX, e.clientY) : null

      // Capture runs before dnd-kit so the pressed node is set before drag activation.

      if (dragSource) {
        dragSource.disabled = !hit

        if (hit) {
          dragSource.data = { kind: 'move', id: hit.id }
        }
      }

      if (!inDesign) {
        return
      }

      // No focus, no text selection, but keep propagating so the sensor sees it.
      e.preventDefault()
      closeInsert()

      if (!press) {
        return
      }

      selectedFromCanvas = true
      select(hit?.id ?? null)
    }
    // Keep the toolbar still while the pointer approaches it, even across other elements.

    let pending: ReturnType<typeof setTimeout> | undefined
    let lastDist = Infinity
    let last = { x: 0, y: 0 }
    const hoverAt = (x: number, y: number) =>
      hover(renderer.hit(x, y)?.id ?? null)
    const onPointerMove = (e: PointerEvent) => {
      if (!e.isTrusted || editor.state.mode !== 'design' || editor.state.drag) {
        return
      }

      pointerInFrame = true
      last = { x: e.clientX, y: e.clientY }
      clearTimeout(pending)

      if (fromOverlay(e)) {
        lastDist = 0

        return
      }

      const r = actionsRect
      const dist = r
        ? Math.hypot(
            Math.max(r.left - e.clientX, 0, e.clientX - r.right),
            Math.max(r.top - e.clientY, 0, e.clientY - r.bottom)
          )
        : Infinity
      const approaching = dist < lastDist && dist < 120

      lastDist = dist

      const id = renderer.hit(e.clientX, e.clientY)?.id ?? null

      if (approaching && id !== editor.state.hoveredId) {
        pending = setTimeout(() => hoverAt(last.x, last.y), 220)

        return
      }

      hover(id)
    }
    const onLeave = () => {
      clearTimeout(pending)
      pointerInFrame = false
      hover(null)
    }
    const onClick = (e: MouseEvent) => {
      if (design(e)) {
        swallow(e)

        const hit = renderer.hit(e.clientX, e.clientY)

        if (hit?.placeholder) {
          const o = offset()

          openInsert({
            refId: hit.id,
            zone: 'inside',
            x: e.clientX + o.x,
            y: e.clientY + o.y + 8,
            source: 'canvas',
          })
        }

        return
      }

      // Interact mode: let components work, but never navigate the preview away.
      const anchor = e
        .composedPath()
        .some(
          n =>
            (n as Element).localName === 'a' &&
            (n as Element).hasAttribute('href')
        )

      if (anchor) {
        e.preventDefault()
        notify("Links don't navigate in the preview")
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (editor.state.mode === 'design' && e.isTrusted) {
        handleShortcut(e)

        // Escape would close an open modal behind our back.
        if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
        }
      }
    }
    const onSubmit = (e: Event) => e.preventDefault()
    // pointerup stays unblocked: an in-progress drag listens for it here.
    const blocked = [
      'mousedown',
      'mouseup',
      'dblclick',
      'auxclick',
      'contextmenu',
      'touchstart',
    ] as const

    win.addEventListener('pointerdown', onPointerDown, true)
    win.addEventListener('pointermove', onPointerMove, true)
    win.addEventListener('click', onClick, true)
    win.addEventListener('keydown', onKey, true)
    win.addEventListener('submit', onSubmit, true)
    doc.documentElement.addEventListener('mouseleave', onLeave)

    for (const type of blocked) {
      win.addEventListener(type, swallow, true)
    }

    return () => {
      clearTimeout(pending)
      win.removeEventListener('pointerdown', onPointerDown, true)
      win.removeEventListener('pointermove', onPointerMove, true)
      win.removeEventListener('click', onClick, true)
      win.removeEventListener('keydown', onKey, true)
      win.removeEventListener('submit', onSubmit, true)
      doc.documentElement.removeEventListener('mouseleave', onLeave)

      for (const type of blocked) {
        win.removeEventListener(type, swallow, true)
      }
    }
  }

  function mountOverlay(doc: Document, win: Window, renderer: Renderer) {
    const host = doc.createElement('pg-overlay')

    // A manual popover lives in the top layer, so it can sit above open modals.
    host.setAttribute('popover', 'manual')

    const root = host.attachShadow({ mode: 'open' })
    const svg = (d: string) =>
      `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${d}"/></svg>`

    root.innerHTML = `<style>${OVERLAY_CSS}</style><div class="box hover"></div><div class="box sel"><span class="tag"></span></div><div class="box drop"><span class="tag"></span></div><div class="actions" role="toolbar"><button type="button" data-act="before"></button><button type="button" data-act="after"></button><span class="sep"></span><button type="button" data-act="duplicate">${svg(PATHS.copy)}</button><button type="button" class="danger" data-act="delete">${svg(PATHS.trash)}</button></div>`
    doc.documentElement.append(host)
    host.showPopover()

    const part = (selector: string) =>
      root.querySelector<HTMLElement>(selector)!
    const [hoverBox, selBox, dropBox] = [
      part('.hover'),
      part('.sel'),
      part('.drop'),
    ]
    const [selTag, dropTag] = [part('.sel .tag'), part('.drop .tag')]
    const actions = part('.actions')
    const [beforeBtn, afterBtn, dupBtn, delBtn] = [
      part('[data-act=before]'),
      part('[data-act=after]'),
      part('[data-act=duplicate]'),
      part('[data-act=delete]'),
    ]
    let actionsFor: string | null = null

    let previewZone: 'before' | 'after' | null = null
    const actOf = (e: Event) =>
      (e.target as Element)
        .closest<HTMLElement>('button')
        ?.getAttribute('data-act')

    actions.addEventListener('pointerover', e => {
      const act = actOf(e)

      previewZone = act === 'before' || act === 'after' ? act : null
    })
    actions.addEventListener('pointerleave', () => (previewZone = null))
    // Keep focus (and keyboard shortcuts) in the editor, not the preview.
    actions.addEventListener('mousedown', e => e.preventDefault())
    actions.addEventListener('click', e => {
      const act = actOf(e)
      const id = actionsFor

      if (!id) {
        return
      }

      if (act === 'before' || act === 'after') {
        const r = (e.target as Element)
          .closest('button')!
          .getBoundingClientRect()
        const o = offset()

        openInsert({
          refId: id,
          zone: act,
          x: r.left + o.x,
          y: r.bottom + o.y + 6,
          source: 'canvas',
        })
      }

      if (act === 'duplicate') {
        duplicate(id)
      }

      if (act === 'delete') {
        hover(null)
        remove(id)
      }
    })

    const place = (el: HTMLElement, r: Box | null) => {
      if (!r || (!r.width && !r.height)) {
        el.style.display = 'none'

        return false
      }

      el.style.display = 'block'
      el.style.left = `${r.left}px`
      el.style.top = `${r.top}px`
      el.style.width = `${r.width}px`
      el.style.height = `${r.height}px`

      return true
    }
    const label = (tagEl: HTMLElement, html: string, top: number) => {
      if (tagEl.innerHTML !== html) {
        tagEl.innerHTML = html
      }

      tagEl.classList.toggle('in', top < 22)
    }
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

    function drawHover(s: State, design: boolean) {
      place(
        hoverBox,
        design && !s.drag && s.hoveredId && s.hoveredId !== s.selectedId
          ? renderer.rect(s.hoveredId)
          : null
      )
    }

    function drawSelection(
      s: State,
      pageNodes: Array<TreeNode>,
      design: boolean
    ) {
      const node =
        design && s.selectedId ? locate(pageNodes, s.selectedId)?.node : null
      const r = node ? renderer.rect(node.id) : null

      if (!place(selBox, r) || !node || !r) {
        return
      }

      const slot = slotOf(node)

      label(
        selTag,
        `${esc(displayName(node.tag))}${slot ? `<i>${esc(slot)}</i>` : ''}`,
        r.top
      )
    }

    // Place actions outside the top-right edge so reaching them never crosses a child.
    function drawActions(
      s: State,
      pageNodes: Array<TreeNode>,
      design: boolean
    ) {
      const loc =
        design && !s.drag && pointerInFrame && s.hoveredId
          ? locate(pageNodes, s.hoveredId)
          : null
      const r = loc ? renderer.rect(loc.node.id) : null

      if (!loc || !r || (!r.width && !r.height)) {
        actions.style.display = 'none'
        actionsFor = null
        actionsRect = null

        return
      }

      if (actionsFor !== loc.node.id) {
        actionsFor = loc.node.id

        const name = displayName(loc.node.tag)

        const sideways = isHorizontal(loc.parent)

        beforeBtn.innerHTML = svg(sideways ? PATHS.addLeft : PATHS.addBefore)
        afterBtn.innerHTML = svg(sideways ? PATHS.addRight : PATHS.addAfter)
        beforeBtn.title = `Add a component before ${name}`
        afterBtn.title = `Add a component after ${name}`
        beforeBtn.setAttribute('aria-label', beforeBtn.title)
        afterBtn.setAttribute('aria-label', afterBtn.title)
        dupBtn.title = `Duplicate ${name} (${modKey()} D)`
        delBtn.title = `Delete ${name} (⌫)`
        dupBtn.setAttribute('aria-label', `Duplicate ${name}`)
        delBtn.setAttribute('aria-label', `Delete ${name}`)
      }

      actions.style.display = 'flex'

      const aw = actions.offsetWidth
      const ah = actions.offsetHeight
      const top =
        r.top - ah >= 0
          ? r.top - ah
          : r.bottom + ah <= win.innerHeight
            ? r.bottom
            : r.top + 3
      let left = r.right - aw

      if (loc.node.id === s.selectedId) {
        const lr = selTag.getBoundingClientRect()

        if (
          lr.width &&
          lr.right + 4 > left &&
          lr.bottom > top &&
          lr.top < top + ah
        ) {
          left = lr.right + 4
        }
      }

      left = Math.max(2, Math.min(left, win.innerWidth - aw - 2))
      actions.style.left = `${left}px`
      actions.style.top = `${top}px`
      actionsRect = { left, top, right: left + aw, bottom: top + ah }
    }

    function drawDropTarget(s: State, pageNodes: Array<TreeNode>) {
      const ins =
        s.inserting ??
        (previewZone && actionsFor
          ? { refId: actionsFor, zone: previewZone }
          : null)
      const insLoc = ins?.refId ? locate(pageNodes, ins.refId) : null
      const t =
        s.drag?.target ??
        (ins && (!ins.refId || insLoc)
          ? {
              refId: ins.refId,
              zone: ins.zone,
              parentId:
                ins.zone === 'inside'
                  ? ins.refId
                  : (insLoc?.parent?.id ?? null),
              slot: '',
              error: null,
            }
          : null)

      if (!t) {
        place(dropBox, null)

        return
      }

      const parent = t.parentId
        ? ((locate(pageNodes, t.parentId)?.node as ElementNode | undefined) ??
          null)
        : null
      let r: Box | null = null

      if (t.zone === 'inside' || !t.refId) {
        const box = t.parentId
          ? renderer.rect(t.parentId)
          : doc.body.getBoundingClientRect()

        r =
          box &&
          (t.parentId
            ? box
            : {
                left: box.left + 4,
                top: box.top + 4,
                width: box.width - 8,
                height: Math.max(48, box.height - 8),
              })
        dropBox.className = `box drop area${t.error ? ' bad' : ''}`
      } else {
        const box = renderer.rect(t.refId)
        const before = t.zone === 'before'

        if (box) {
          r = isHorizontal(parent)
            ? {
                left: (before ? box.left : box.right) - 1.5,
                top: box.top,
                width: 3,
                height: box.height,
              }
            : {
                left: box.left,
                top: (before ? box.top : box.bottom) - 1.5,
                width: box.width,
                height: 3,
              }
        }

        dropBox.className = `box drop line${t.error ? ' bad' : ''}`
      }

      if (!place(dropBox, r) || !r) {
        return
      }

      const where = parent
        ? `${esc(displayName(parent.tag))}${t.slot ? `<i>${esc(t.slot)}</i>` : ''}`
        : 'Page'

      label(dropTag, !t.error && t.zone === 'inside' ? where : '', r.top)
    }

    // ponytail: per-frame rect polling keeps overlays glued through animations and scroll; observers if it ever shows in a profile
    let raf = 0
    const draw = () => {
      const s = editor.state
      const pageNodes = currentPage(s).nodes
      const design = s.mode === 'design'

      drawHover(s, design)
      drawSelection(s, pageNodes, design)
      drawActions(s, pageNodes, design)
      drawDropTarget(s, pageNodes)
      raf = win.requestAnimationFrame(draw)
    }

    raf = win.requestAnimationFrame(draw)
    cleanups.push(() => win.cancelAnimationFrame(raf))

    return host
  }

  createEffect(() => {
    const c = ctx()
    const cat = catalog()

    if (c && cat) {
      c.renderer.render(nodes(), cat)
    }
  })

  createEffect(() => {
    const c = ctx()

    if (!c) {
      return
    }

    c.doc.body.classList.toggle('pg-design', mode() === 'design')
    c.doc.body.classList.toggle('pg-interact', mode() === 'interact')
  })

  createEffect(on(pageId, () => ctx()?.win.scrollTo({ top: 0 })))

  // Track nodes too so a newly inserted modal opens once its DOM exists.

  let revealed: Array<Element> = []
  let lastId: string | null = null

  createEffect(
    on([selectedId, ctx, mode, nodes], ([id, c, m]) => {
      if (!c) {
        return
      }

      const path =
        id && m === 'design' ? (pathTo(currentPage().nodes, id) ?? []) : []
      const want = path
        .filter(n => OVERLAYS.has(n.tag))
        .map(n => c.renderer.element(n.id))
        .filter((el): el is Element => el?.nodeType === Node.ELEMENT_NODE)

      for (const el of revealed) {
        if (!want.includes(el) && el.isConnected) {
          hideOverlay(el)
        }
      }

      const opened = want.filter(el => !revealed.includes(el))

      opened.forEach(el => showOverlay(c.doc, el))
      revealed = want

      if (opened.length) {
        const raise = () => {
          c.overlay.hidePopover()
          c.overlay.showPopover()
        }

        setTimeout(raise, 30)
        setTimeout(raise, 250)
      }

      if (id !== lastId) {
        lastId = id

        // Wait for the next frame to avoid forcing layout while the editor is updating.

        if (id && !selectedFromCanvas) {
          c.win.requestAnimationFrame(() => {
            const r = c.renderer.rect(id)

            if (r && (r.top < 0 || r.bottom > c.win.innerHeight)) {
              c.win.scrollBy({
                top: r.top - c.win.innerHeight / 3,
                behavior: 'smooth',
              })
            }
          })
        }

        selectedFromCanvas = false
      }
    })
  )

  cleanups.push(
    registerCanvasHit((x, y, tag, movingId) => {
      const c = ctx()

      if (!c) {
        return null
      }

      const o = offset()
      const lx = x - o.x
      const ly = y - o.y
      const hit = c.renderer.hit(lx, ly)

      if (!hit) {
        return rootTarget(tag)
      }

      if (hit.placeholder) {
        return targetAt(hit.id, 'inside', tag, movingId)
      }

      const loc = locate(currentPage().nodes, hit.id)
      const r = c.renderer.rect(hit.id)

      if (!loc || !r) {
        return rootTarget(tag)
      }

      const horizontal = isHorizontal(loc.parent)
      const t = horizontal
        ? (lx - r.left) / Math.max(1, r.width)
        : (ly - r.top) / Math.max(1, r.height)
      const container =
        !isText(loc.node) && isContainer(editor.state.catalog!, loc.node.tag)
      const zone = container
        ? t < 0.2
          ? 'before'
          : t > 0.8
            ? 'after'
            : 'inside'
        : t < 0.5
          ? 'before'
          : 'after'

      return forgivingTarget(hit.id, zone, tag, movingId, t >= 0.5)
    })
  )

  onCleanup(() => {
    cleanups.forEach(fn => fn())
    cleanups = []
  })

  return (
    <>
      <iframe
        ref={iframe}
        title={`Preview, Polaris ${VERSION_LABEL[props.version]}`}
        srcdoc={frameDocument(props.version)}
        onLoad={onLoad}
        class="block size-full border-0"
      />

      <Show when={state() === 'loading'}>
        <div class="absolute inset-0 grid place-items-center bg-[#f1f1f1] text-sm text-ink-3">
          Loading Polaris {VERSION_LABEL[props.version]}…
        </div>
      </Show>

      <Show when={state() === 'error'}>
        <div class="absolute inset-0 grid place-items-center bg-[#f1f1f1] p-6">
          <div class="max-w-sm text-center">
            <p class="font-medium">Polaris didn't load</p>

            <p class="mt-1 text-sm text-ink-2">
              The preview loads {POLARIS_SCRIPT[props.version].split('/').pop()}{' '}
              from Shopify's CDN. Check your connection or content blockers,
              then try again.
            </p>

            <Button
              class="mt-4"
              onClick={() => iframe.contentWindow?.location.reload()}
            >
              Try again
            </Button>
          </div>
        </div>
      </Show>
    </>
  )
}

function EmptyPage() {
  const starters = TEMPLATES.filter(t => t.id !== 'blank').slice(0, 4)

  return (
    <div class="pointer-events-none absolute inset-0 grid place-items-center p-6">
      <div class="pointer-events-auto w-full max-w-md rounded-xl border border-line bg-panel p-6 text-center shadow-sm">
        <p class="text-[15px] font-semibold">This page is empty</p>

        <p class="mt-1 text-sm text-ink-2">
          Drag components here from the left, or start from a layout.
        </p>

        <div class="mt-4 grid grid-cols-2 gap-2">
          <For each={starters}>
            {t => (
              <button
                type="button"
                class="rounded-lg border border-line px-3 py-2 text-left transition-colors hover:border-line-strong hover:bg-chrome"
                onClick={() =>
                  replacePage(fromTemplate(t.id, currentPage().name))
                }
              >
                <span class="block font-medium">{t.name}</span>

                <span class="block text-xs text-ink-3">{t.blurb}</span>
              </button>
            )}
          </For>
        </div>
      </div>
    </div>
  )
}

function StatusBar() {
  const nodes = useSelector(editor, s => currentPage(s).nodes)
  const selectedId = useSelector(editor, s => s.selectedId)
  const pageName = useSelector(editor, s => currentPage(s).name)
  const catalog = useSelector(editor, s => s.catalog)
  const path = createMemo(
    () => {
      const id = selectedId()

      return id ? (pathTo(nodes(), id) ?? []) : []
    },
    [],
    {
      equals: (a, b) => a.length === b.length && a.every((n, i) => n === b[i]),
    }
  )
  const counts = createMemo(() => {
    const c = catalog()
    const issues = c ? validate(c, nodes()) : []

    return {
      errors: issues.filter(i => i.level === 'error').length,
      warnings: issues.filter(i => i.level === 'warning').length,
    }
  })

  return (
    <div class="flex h-8 shrink-0 items-center gap-3 border-t border-line bg-panel px-3 text-sm select-none">
      <nav
        aria-label="Selection path"
        class="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden text-ink-3"
      >
        <button
          type="button"
          class="truncate rounded px-1 hover:bg-hover hover:text-ink"
          onClick={() => select(null)}
        >
          {pageName()}
        </button>

        <For each={path()}>
          {(n, i) => (
            <>
              <Icon
                name="chevronRight"
                size={12}
                class="text-line-strong"
              />

              <button
                type="button"
                class={`truncate rounded px-1 hover:bg-hover hover:text-ink ${i() === path().length - 1 ? 'font-medium text-ink' : ''}`}
                onClick={() => select(n.id)}
              >
                {displayName(n.tag)}
              </button>
            </>
          )}
        </For>
      </nav>

      <button
        type="button"
        onClick={() => select(null)}
        title="Show problems on this page"
        class="flex shrink-0 items-center gap-3 rounded px-1.5 py-0.5 hover:bg-hover"
      >
        <Show
          when={counts().errors + counts().warnings}
          fallback={
            <span class="flex items-center gap-1 text-ok">
              <Icon
                name="check"
                size={14}
              />{' '}
              No problems
            </span>
          }
        >
          <Show when={counts().errors}>
            <span class="flex items-center gap-1 text-danger">
              <Icon
                name="error"
                size={14}
              />{' '}
              {counts().errors} {counts().errors === 1 ? 'error' : 'errors'}
            </span>
          </Show>

          <Show when={counts().warnings}>
            <span class="flex items-center gap-1 text-warn">
              <Icon
                name="warning"
                size={14}
              />{' '}
              {counts().warnings}{' '}
              {counts().warnings === 1 ? 'warning' : 'warnings'}
            </span>
          </Show>
        </Show>
      </button>
    </div>
  )
}
