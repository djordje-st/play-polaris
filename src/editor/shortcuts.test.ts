// @vitest-environment happy-dom

import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { resetEditor, selectedNode } from '../test/editor'
import {
  currentPage,
  dismissToast,
  editor,
  select,
  setAccess,
  setText,
} from './store'
import {
  handleShortcut,
  installClipboard,
  modKey,
  shortcutList,
} from './shortcuts'
import { textOf } from './model'

let off: () => void
const key = (
  name: string,
  options: KeyboardEventInit = {},
  target: HTMLElement = document.body
) => {
  const event = new KeyboardEvent('keydown', {
    key: name,
    bubbles: true,
    cancelable: true,
    ...options,
  })

  target.dispatchEvent(event)

  return event
}

beforeEach(() => {
  resetEditor(
    '<s-section><s-button>A</s-button><s-button>B</s-button></s-section>'
  )
  document.addEventListener('keydown', handleShortcut)
  off = installClipboard()
})

afterEach(() => {
  off()
  dismissToast()
  document.removeEventListener('keydown', handleShortcut)
  document.body.replaceChildren()
  document.body.className = ''
  vi.restoreAllMocks()
})

test('navigates layers, collapses groups, selects parents and nudges siblings', () => {
  key('ArrowDown')

  const sectionId = editor.state.selectedId!

  key('ArrowRight')

  const a = editor.state.selectedId!

  expect(selectedNode(a).tag).toBe('s-button')
  key('ArrowDown')
  expect(textOf(selectedNode())).toBe('B')
  key('ArrowUp', { altKey: true })
  expect(selectedNode(sectionId).children.map(textOf)).toEqual(['B', 'A'])
  key('ArrowUp')
  key('Escape')
  select(sectionId)
  key('ArrowLeft')
  expect(editor.state.collapsed[sectionId]).toBe(true)
  key('ArrowRight')
  expect(editor.state.collapsed[sectionId]).toBeUndefined()
  select(a)
  key('ArrowLeft')
  expect(editor.state.selectedId).toBe(sectionId)
})

test('keyboard duplicate, delete, undo and redo update the document', () => {
  select(currentPage().nodes[0]!.id)
  key('d', { ctrlKey: true })
  expect(currentPage().nodes).toHaveLength(2)
  key('Delete')
  expect(currentPage().nodes).toHaveLength(1)
  key('z', { ctrlKey: true })
  expect(currentPage().nodes).toHaveLength(2)
  key('z', { ctrlKey: true, shiftKey: true })
  expect(currentPage().nodes).toHaveLength(1)
  key('z', { metaKey: true })
  key('y', { ctrlKey: true })
  expect(currentPage().nodes).toHaveLength(1)
})

test.each(['input', 'textarea', 'select', 'div'])(
  'does not consume editing keys in %s',
  tag => {
    const field = document.createElement(tag)

    if (tag === 'div') {
      field.contentEditable = 'true'
    }

    document.body.append(field)
    select(currentPage().nodes[0]!.id)
    expect(key('Backspace', {}, field).defaultPrevented).toBe(false)
    expect(key('z', { ctrlKey: true }, field).defaultPrevented).toBe(false)
    expect(currentPage().nodes).toHaveLength(1)
  }
)

test('dialogs, tours and handled events suppress editor shortcuts', () => {
  select(currentPage().nodes[0]!.id)
  document.body.innerHTML = '<dialog open></dialog>'
  key('Delete')
  document.body.replaceChildren()
  document.body.classList.add('driver-active')
  key('Delete')
  document.body.className = ''

  const event = new KeyboardEvent('keydown', {
    key: 'Delete',
    cancelable: true,
  })

  event.preventDefault()
  handleShortcut(event)
  expect(currentPage().nodes).toHaveLength(1)
})

test('open popovers keep Escape and Delete from changing the selected component', () => {
  const id = currentPage().nodes[0]!.id

  select(id)

  // happy-dom cannot expose the browser's native :popover-open state.
  const querySelector = document.querySelector.bind(document)
  const popover = document.createElement('div')

  vi.spyOn(document, 'querySelector').mockImplementation(selector =>
    selector.includes(':popover-open') ? popover : querySelector(selector)
  )
  expect(key('Escape').defaultPrevented).toBe(false)
  expect(key('Delete').defaultPrevented).toBe(false)
  expect(editor.state.selectedId).toBe(id)
  expect(currentPage().nodes).toHaveLength(1)
})

test('find shortcut emits its event and shortcut labels follow platform', () => {
  const find = vi.fn()

  window.addEventListener('playground:find-component', find)
  key('k', { ctrlKey: true })
  expect(find).toHaveBeenCalledOnce()
  window.removeEventListener('playground:find-component', find)
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel')
  expect(modKey()).toBe('⌘')
  expect(shortcutList()[0]?.[0]).toBe('⌘ Z')
})

test('copy, cut and paste transport markup and preserve input clipboard behavior', () => {
  select(currentPage().nodes[0]!.id)

  const data = new DataTransfer()

  document.dispatchEvent(
    new ClipboardEvent('copy', { clipboardData: data, cancelable: true })
  )
  expect(data.getData('text/plain')).toContain('<s-section>')
  document.dispatchEvent(
    new ClipboardEvent('cut', { clipboardData: data, cancelable: true })
  )
  expect(currentPage().nodes).toHaveLength(0)
  document.dispatchEvent(
    new ClipboardEvent('paste', { clipboardData: data, cancelable: true })
  )
  expect(currentPage().nodes[0]?.tag).toBe('s-section')

  const field = document.createElement('input')

  document.body.append(field)
  field.focus()

  const event = new ClipboardEvent('cut', {
    clipboardData: data,
    cancelable: true,
  })

  document.dispatchEvent(event)
  expect(event.defaultPrevented).toBe(false)
  expect(currentPage().nodes).toHaveLength(1)
})

test('paste rejects disallowed placement and ignores unrelated text', () => {
  const data = new DataTransfer()

  data.setData('text/plain', 'plain text')

  const event = new ClipboardEvent('paste', {
    clipboardData: data,
    cancelable: true,
  })

  document.dispatchEvent(event)
  expect(event.defaultPrevented).toBe(false)
  data.setData('text/plain', '<s-table-cell></s-table-cell>')
  document.dispatchEvent(
    new ClipboardEvent('paste', { clipboardData: data, cancelable: true })
  )
  expect(editor.state.toast?.tone).toBe('critical')
  data.setData('text/plain', '<div><s-button>Allowed</s-button></div>')
  document.dispatchEvent(
    new ClipboardEvent('paste', { clipboardData: data, cancelable: true })
  )
  expect(editor.state.toast?.message).toContain('Skipped')
})

test.each([false, true])(
  'view-only keyboard history cannot change the mirrored document (redo: %s)',
  redo => {
    const id = selectedNode(currentPage().nodes[0]!.id).children[0]!.id

    setText(id, 'Edited')

    if (redo) {
      key('z', { ctrlKey: true })
    }

    setAccess('viewing')

    const doc = editor.state.doc

    key('z', { ctrlKey: true, shiftKey: redo })
    expect(editor.state.doc).toBe(doc)
  }
)
