// @vitest-environment happy-dom

import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { button, mount } from '../test/dom'
import { resetEditor } from '../test/editor'
import * as store from '../editor/store'
import { Canvas } from './Canvas'
import { onDragMove } from '../editor/dnd'

beforeEach(() =>
  resetEditor(
    '<s-section heading="Section"><s-button>Save</s-button></s-section>'
  )
)
afterEach(() => {
  store.dismissToast()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

function readyFrame() {
  const root = mount(() => <Canvas />)
  const iframe = root.querySelector('iframe')!
  // Supply only the CDN-ready handshake and layout APIs; use the real renderer and iframe DOM.
  const doc = iframe.contentDocument!
  const win = iframe.contentWindow!

  win.customElements.define('s-page', class extends HTMLElement {})

  const proto = Object.getPrototypeOf(doc.createElement('pg-overlay'))

  proto.showPopover = HTMLElement.prototype.showPopover
  proto.hidePopover = HTMLElement.prototype.hidePopover
  proto.matches = Element.prototype.matches
  doc.body.replaceChildren()

  const frames: FrameRequestCallback[] = []

  vi.spyOn(win, 'requestAnimationFrame').mockImplementation(callback => {
    frames.push(callback)

    return frames.length
  })

  const cancel = vi
    .spyOn(win, 'cancelAnimationFrame')
    .mockImplementation(() => {})

  iframe.dispatchEvent(new Event('load'))

  return {
    root,
    doc,
    win,
    cancel,
    frame: () => frames.splice(0).forEach(callback => callback(0)),
  }
}

test('canvas reports CDN load errors and offers retry', () => {
  const root = mount(() => <Canvas />)

  expect(root.textContent).toContain('Loading Polaris')

  const iframe = root.querySelector('iframe')!
  const reload = vi
    .spyOn(iframe.contentWindow!.location, 'reload')
    .mockImplementation(() => {})

  iframe.dispatchEvent(new Event('load'))
  expect(root.textContent).toContain("Polaris didn't load")
  button('Try again', root).click()
  expect(reload).toHaveBeenCalledOnce()
  expect(iframe.srcdoc).toContain('polaris-1.js')
  store.setVersion('v2')
  expect(root.querySelector('iframe')!.srcdoc).toContain('polaris-2.0-rc.js')
})

test('canvas renders editor changes, switches modes, sizes viewports and blocks preview navigation', () => {
  const { root, doc } = readyFrame()

  expect(root.textContent).not.toContain('Loading Polaris')
  expect(doc.querySelector('s-button')?.textContent).toBe('Save')

  const id = store.currentPage().nodes[0]!.id

  store.setAttr(id, 'heading', 'Updated')
  expect(doc.querySelector('s-section')?.getAttribute('heading')).toBe(
    'Updated'
  )
  store.setMode('interact')
  expect(doc.body.classList.contains('pg-interact')).toBe(true)
  store.setViewport('mobile')
  expect(root.querySelector('iframe')!.parentElement!.style.width).toBe('390px')

  const anchor = doc.createElement('a')

  anchor.href = 'https://example.com/'
  doc.body.append(anchor)

  const click = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    composed: true,
  })

  anchor.dispatchEvent(click)
  expect(click.defaultPrevented).toBe(true)
  expect(store.editor.state.toast?.message).toContain("Links don't navigate")

  const submit = new Event('submit', { bubbles: true, cancelable: true })

  doc.body.dispatchEvent(submit)
  expect(submit.defaultPrevented).toBe(true)
})

test('selection, breadcrumbs, insertion and drag targets update canvas overlays', () => {
  const { root, doc, frame, win } = readyFrame()
  const section = store.currentPage().nodes[0]!
  const element = doc.querySelector('s-section')!

  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(20, 30, 200, 100)
  )

  const overlay = doc.querySelector('pg-overlay')!.shadowRoot!

  store.select(section.id)
  frame()
  expect(overlay.querySelector<HTMLElement>('.sel')!.style.display).toBe(
    'block'
  )
  expect(overlay.querySelector('.sel .tag')!.textContent).toBe('Section')
  button('Section', root).click()
  expect(store.editor.state.selectedId).toBe(section.id)
  store.openInsert({
    refId: section.id,
    zone: 'inside',
    x: 1,
    y: 1,
    source: 'canvas',
  })
  frame()
  expect(overlay.querySelector('.drop')!.className).toContain('area')
  expect(overlay.querySelector('.drop .tag')!.textContent).toBe('Section')
  store.openInsert({
    refId: section.id,
    zone: 'before',
    x: 1,
    y: 1,
    source: 'canvas',
  })
  frame()
  expect(overlay.querySelector('.drop')!.className).toContain('line')
  store.closeInsert()
  store.setDrag({
    label: 'Button',
    x: 0,
    y: 0,
    target: {
      index: 0,
      parentId: section.id,
      refId: section.id,
      zone: 'inside',
      slot: '',
      error: 'No room',
    },
  })
  frame()
  expect(overlay.querySelector('.drop')!.className).toContain('bad')
  store.setDrag(null)
  store.hover(section.id)
  doc.documentElement.dispatchEvent(new Event('mouseleave'))
  expect(store.editor.state.hoveredId).toBeNull()
  button('Test page', root).click()
  expect(store.editor.state.selectedId).toBeNull()

  const scroll = vi.spyOn(win, 'scrollTo').mockImplementation(() => {})

  store.addPage('Next', [])
  expect(scroll).toHaveBeenCalledWith({ top: 0 })
})

test('empty-page starters insert layouts and status links expose validation issues', () => {
  resetEditor()

  const root = mount(() => <Canvas />)

  expect(root.textContent).toContain('This page is empty')

  const starter = [...root.querySelectorAll<HTMLButtonElement>('button')].find(
    element => element.textContent.includes('Home')
  )!

  starter.click()
  expect(store.currentPage().nodes.length).toBeGreaterThan(0)
  expect(root.textContent).not.toContain('This page is empty')
  store.replacePage(
    store.parse('<s-table-cell>Orphan</s-table-cell><s-image></s-image>').nodes
  )
  expect(root.textContent).toContain('error')
  expect(root.textContent).toContain('warning')
  store.select(store.currentPage().nodes[0]!.id)
  root
    .querySelector<HTMLButtonElement>('[title="Show problems on this page"]')!
    .click()
  expect(store.editor.state.selectedId).toBeNull()
})

test('selecting overlay contents reveals modals and popovers, and changing mode hides them', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  resetEditor(
    '<s-modal id="dialog"><s-button>Inside</s-button></s-modal><s-popover id="popover"><s-button>Popover action</s-button></s-popover><s-button commandFor="popover">Open</s-button>'
  )

  const { doc, win, frame } = readyFrame()
  const modal = Object.assign(doc.querySelector('s-modal')!, {
    showOverlay: vi.fn(),
    hideOverlay: vi.fn(),
  })
  const popover = doc.querySelector('s-popover')!
  const content = doc.createElement('div')

  content.setAttribute('popover', 'auto')
  popover.attachShadow({ mode: 'open' }).append(content)

  const trigger = doc.querySelector<HTMLElement>('[commandfor="popover"]')!
  const click = vi
    .spyOn(trigger, 'click')
    .mockImplementation(() => content.showPopover())
  const [modalNode, popoverNode] = store.currentPage().nodes

  store.select(modalNode!.id)
  expect(modal.showOverlay).toHaveBeenCalledOnce()
  store.select(popoverNode!.id)
  expect(modal.hideOverlay).toHaveBeenCalledOnce()
  expect(click).toHaveBeenCalledOnce()
  expect(content.matches(':popover-open')).toBe(true)
  store.setMode('interact')
  expect(content.matches(':popover-open')).toBe(false)
  trigger.remove()
  store.setMode('design')
  expect(content.matches(':popover-open')).toBe(true)
  vi.advanceTimersByTime(250)
  expect(doc.querySelector('pg-overlay')!.matches(':popover-open')).toBe(true)
  store.select(null)
  vi.spyOn(popover, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, -100, 100, 50)
  )

  const scroll = vi.spyOn(win, 'scrollBy').mockImplementation(() => {})

  store.select(popoverNode!.id)
  frame()
  expect(scroll).toHaveBeenCalledWith(
    expect.objectContaining({ behavior: 'smooth' })
  )
})

test('drag targeting uses iframe coordinates, placeholders, edges and horizontal layouts', () => {
  resetEditor(
    '<s-section></s-section><s-stack direction="inline"><s-button>A</s-button><s-button>B</s-button></s-stack>'
  )

  const { root, doc } = readyFrame()
  const iframe = root.querySelector('iframe')!

  document.elementsFromPoint = () => [iframe]

  const section = doc.querySelector('s-section')!
  const action = doc.querySelector('s-button')!

  vi.spyOn(section, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, 100, 100)
  )
  vi.spyOn(action, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, 100, 100)
  )

  const sectionId = store.currentPage().nodes[0]!.id
  const move = (x: number, y: number) =>
    onDragMove({
      operation: {
        source: { data: { kind: 'new', tag: 's-button' } },
        position: { current: { x, y } },
      },
    } as unknown as Parameters<typeof onDragMove>[0])

  doc.elementFromPoint = () => section.querySelector('.pg-empty')
  move(50, 50)
  expect(store.editor.state.drag?.target).toMatchObject({
    zone: 'inside',
    parentId: sectionId,
  })
  doc.elementFromPoint = () => section

  for (const [y, zone] of [
    [10, 'before'],
    [50, 'inside'],
    [90, 'after'],
  ] as const) {
    move(50, y)
    expect(store.editor.state.drag?.target?.zone).toBe(zone)
  }

  doc.elementFromPoint = () => action
  move(10, 50)
  expect(store.editor.state.drag?.target?.zone).toBe('before')
  move(90, 50)
  expect(store.editor.state.drag?.target?.zone).toBe('after')
  doc.elementFromPoint = () => null
  move(150, 150)
  expect(store.editor.state.drag?.target).toMatchObject({
    refId: null,
    parentId: null,
  })
})
