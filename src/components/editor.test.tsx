// @vitest-environment happy-dom

import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { DragDropProvider } from '@dnd-kit/solid'
import { createSignal } from 'solid-js'
import { mount, button, input, submit } from '../test/dom'
import { resetEditor, selectedNode } from '../test/editor'
import * as store from '../editor/store'
import { toHTML } from '../editor/codegen'
import { dndPlugins, dndSensors } from '../editor/dnd'
import { Inspector } from './Inspector'
import { Sidebar } from './Sidebar'
import { Toolbar } from './Toolbar'
import { InsertPicker } from './InsertPicker'
import { ImportDialog, NewPageDialog, SavePresetDialog } from './dialogs'
import { ExportDialog } from './ExportDialog'
import { unzipSync, strFromU8 } from 'fflate'

beforeEach(() =>
  resetEditor(
    '<s-section heading="Actions"><s-button>Save</s-button></s-section>'
  )
)
afterEach(() => {
  store.dismissToast()
  vi.restoreAllMocks()
})

test('inspector edits page names, text, enum props and boolean props through controls', () => {
  const root = mount(() => <Inspector />)

  input('[aria-label="Page name"]', 'Renamed', root).dispatchEvent(
    new Event('change', { bubbles: true })
  )
  expect(store.currentPage().name).toBe('Renamed')

  const id = selectedNode(store.currentPage().nodes[0]!.id).children[0]!.id

  store.select(id)
  input('[aria-label="Content"]', 'Changed', root)
  input('[aria-label="variant"]', 'primary', root)
  button('disabled', root).click()
  expect(selectedNode().attrs).toMatchObject({
    variant: 'primary',
    disabled: true,
  })
  expect(toHTML(store.currentPage().nodes, store.catalog())).toContain(
    'Changed'
  )
  button('disabled', root).click()
  input('[aria-label="variant"]', '', root)
  expect(selectedNode().attrs).not.toHaveProperty('disabled')
  expect(selectedNode().attrs).not.toHaveProperty('variant')
  input('[aria-label="Filter properties"]', 'no-such-property', root)
  expect(root.textContent).toContain('No property matches')
  button('Delete (⌫)', root).click()
  expect(selectedNode(store.currentPage().nodes[0]!.id).children).toHaveLength(
    0
  )
})

test('inspector keeps controls, order and focus stable while editing and resetting', () => {
  resetEditor('<s-button>Save</s-button>')
  store.select(store.currentPage().nodes[0]!.id)

  const root = mount(() => <Inspector />)
  const controls = () => [
    ...root.querySelectorAll('input, select, [role="switch"]'),
  ]
  const initial = controls()
  const variant = root.querySelector<HTMLSelectElement>(
    '[aria-label="variant"]'
  )!
  const reset = button('Reset variant', root)

  expect(reset.disabled).toBe(true)
  variant.focus()
  input('[aria-label="variant"]', 'primary', root)
  expect(selectedNode().attrs.variant).toBe('primary')
  expect(document.activeElement).toBe(variant)
  expect(controls()).toEqual(initial)
  expect(reset.disabled).toBe(false)
  reset.click()
  expect(selectedNode().attrs).not.toHaveProperty('variant')
  expect(variant.value).toBe('')
  expect(reset.disabled).toBe(true)
  expect(controls()).toEqual(initial)

  const help = button('Help for variant', root)
  const popover = document.getElementById(help.getAttribute('popovertarget')!)!

  expect(popover.hasAttribute('popover')).toBe(true)
  expect(popover.textContent).toContain(
    store
      .catalog()
      .components['s-button']!.props.find(p => p.name === 'variant')!
      .description
  )
})

test.each(['v1', 'v2'] as const)(
  'inspector uses selects for every fixed choice in %s',
  version => {
    resetEditor(
      '<s-icon type="invalid"></s-icon><s-press-button></s-press-button><s-stack></s-stack>',
      version
    )

    const [icon, pressButton, stack] = store.currentPage().nodes

    store.select(icon!.id)

    const root = mount(() => <Inspector />)
    const type = root.querySelector<HTMLSelectElement>(
      'select[aria-label="type"]'
    )!

    expect(type).not.toBeNull()
    expect(type.options.length).toBeGreaterThan(24)
    expect(type.value).toBe('invalid')
    expect(type.getAttribute('aria-invalid')).toBe('true')
    expect(type.selectedOptions[0]!.disabled).toBe(true)
    input('[aria-label="type"]', 'info', root)
    expect(selectedNode().attrs.type).toBe('info')
    expect(type.getAttribute('aria-invalid')).toBe('false')
    expect([...type.options].some(option => option.value === 'invalid')).toBe(
      false
    )
    button('Reset type', root).click()
    expect(type.value).toBe('')
    expect(selectedNode().attrs).not.toHaveProperty('type')

    store.select(pressButton!.id)
    expect(root.querySelector('select[aria-label="tone"]')).not.toBeNull()
    input('[aria-label="tone"]', 'neutral', root)
    expect(selectedNode().attrs.tone).toBe('neutral')

    store.select(stack!.id)
    expect(root.querySelector('input[aria-label="inlineSize"]')).not.toBeNull()
    input('[aria-label="inlineSize"]', '240px', root)
    input('[aria-label="gap"]', 'small large', root)
    expect(selectedNode().attrs).toMatchObject({
      inlineSize: '240px',
      gap: 'small large',
    })
  }
)

test.each([
  '<s-text-field label="Name"></s-text-field>',
  '<s-number-field label="Count" min="bad"></s-number-field>',
  '<s-icon type="invalid"></s-icon>',
  '<s-image alt=""></s-image>',
  '<s-table-cell></s-table-cell>',
])('inspector renders typed controls and issues for %s', html => {
  resetEditor(html)
  store.select(store.currentPage().nodes[0]!.id)

  const root = mount(() => <Inspector />)

  expect(root.querySelector('h2')?.textContent).toBeTruthy()
  expect(root.textContent).toContain('Properties')
  input('[aria-label="id"]', 'identifier', root)
  expect(selectedNode().attrs.id).toBe('identifier')
  input('[aria-label="id"]', '', root)
  expect(selectedNode().attrs).not.toHaveProperty('id')
})

test('inspector edits text nodes, removes unknown props and changes slots', () => {
  resetEditor('<s-page><s-button unknown="x">Save</s-button></s-page>')

  const page = selectedNode(store.currentPage().nodes[0]!.id)
  const action = selectedNode(page.children[0]!.id)

  store.select(action.id)

  const root = mount(() => <Inspector />)

  button('Remove', root).click()
  expect(selectedNode().attrs).not.toHaveProperty('unknown')
  input('[aria-label="Slot"]', 'primary-action', root)
  expect(selectedNode().attrs.slot).toBe('primary-action')
  store.select(action.children[0]!.id)
  input('[aria-label="Text"]', 'Text edit', root)
  expect(toHTML(store.currentPage().nodes, store.catalog())).toContain(
    'Text edit'
  )
})

test('new-page form validates names and creates a chosen template', () => {
  const close = vi.fn()
  const root = mount(() => (
    <NewPageDialog
      open
      onClose={close}
    />
  ))

  input('input:not([type="radio"])', '', root)
  submit(root)
  expect(root.textContent).toContain('Give the page a name')
  input('input:not([type="radio"])', 'Test page', root)
  expect(root.textContent).toContain('already uses this name')
  input('input:not([type="radio"])', 'Settings', root)
  root.querySelector<HTMLInputElement>('[value="settings"]')!.click()
  submit(root)
  expect(store.currentPage().name).toBe('Settings')
  expect(store.currentPage().nodes.length).toBeGreaterThan(0)
  expect(close).toHaveBeenCalledOnce()
})

test.each(['insert', 'replace', 'page'])(
  'import dialog %s mode changes the intended document',
  mode => {
    const close = vi.fn()
    const root = mount(() => (
      <ImportDialog
        open
        onClose={close}
      />
    ))

    input('textarea', '<div></div>', root)
    expect(root.textContent).toContain('No Polaris components')
    input('textarea', '<div><s-button>Imported</s-button></div>', root)

    const index = ['insert', 'replace', 'page'].indexOf(mode)

    root.querySelectorAll<HTMLInputElement>('[type="radio"]')[index]!.click()
    submit(root)
    expect(toHTML(store.currentPage().nodes, store.catalog())).toContain(
      'Imported'
    )
    expect(store.editor.state.doc.pages).toHaveLength(mode === 'page' ? 2 : 1)
    expect(store.currentPage().nodes).toHaveLength(mode === 'insert' ? 2 : 1)
    expect(close).toHaveBeenCalledOnce()
  }
)

test('saved-component form creates and edits reusable content', () => {
  const close = vi.fn()
  const root = mount(() => (
    <SavePresetDialog
      target={{ kind: 'new', nodes: store.currentPage().nodes }}
      onClose={close}
    />
  ))

  input('input', '', root)
  expect(root.textContent).toContain('Give the component a name')
  input('input', 'Reusable actions', root)
  input('input[placeholder]', 'Description', root)
  submit(root)

  const preset = store.editor.state.presets[0]!

  expect(preset).toMatchObject({
    name: 'Reusable actions',
    description: 'Description',
  })

  const edit = mount(() => (
    <SavePresetDialog
      target={{ kind: 'edit', preset }}
      onClose={close}
    />
  ))

  input('input', 'Updated', edit)
  submit(edit)
  expect(store.editor.state.presets[0]?.name).toBe('Updated')
})

test('toolbar controls mode, version, viewport, history, save state and export', () => {
  const root = mount(() => (
    <Toolbar
      loadingVersion
      agentReady
    />
  ))

  root
    .querySelector<HTMLButtonElement>(
      '[aria-label="Polaris version"] button:last-child'
    )!
    .click()
  expect(store.editor.state.doc.version).toBe('v2')
  button('Interact', root).click()
  expect(store.editor.state.mode).toBe('interact')
  root.querySelector<HTMLButtonElement>('[title="Mobile, 390px"]')!.click()
  expect(store.editor.state.viewport).toBe('mobile')
  store.setText(store.currentPage().nodes[0]!.id, 'Changed')
  root.querySelector<HTMLButtonElement>('[aria-label^="Undo"]')!.click()
  expect(
    root.querySelector<HTMLButtonElement>('[aria-label^="Redo"]')?.disabled
  ).toBe(false)
  root.querySelector<HTMLButtonElement>('[aria-label^="Redo"]')!.click()
  store.setSaveState('saving')
  expect(root.textContent).toContain('Saving…')
  store.setSaveState('error')
  expect(root.textContent).toContain('Not saved')
  store.setAccess('viewing')
  expect(root.textContent).toContain('View only')
  store.logAgent('Test tool', 'Done', true)
  store.logAgent('Failed tool', 'Error', false)
  expect(root.textContent).toContain('Recent activity')
  button('Export', root).click()
  expect(root.querySelector('dialog')?.open).toBe(true)
  button('Close', root).click()
  expect(root.querySelector('dialog')?.open).toBe(false)
})

test('sidebar creates pages, selects layers and inserts searched components', async () => {
  const root = mount(() => (
    <DragDropProvider
      plugins={dndPlugins}
      sensors={dndSensors}
    >
      <Sidebar />
    </DragDropProvider>
  ))

  root
    .querySelector<HTMLElement>('[data-tree-row]')!
    .dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0 })
    )
  expect(store.editor.state.selectedId).toBe(store.currentPage().nodes[0]!.id)
  button('New page', root).click()
  input('dialog input:not([type="radio"])', 'New screen', root)
  submit(root)
  expect(store.currentPage().name).toBe('New screen')
  button('Test page', root).click()
  expect(store.currentPage().name).toBe('Test page')
  window.dispatchEvent(new Event('playground:find-component'))
  await Promise.resolve()
  input('[aria-label="Search components"]', 's-button', root)
  button('Button', root).click()
  expect(selectedNode().tag).toBe('s-button')
  input('[aria-label="Search components"]', 'no-such-component', root)
  expect(root.textContent).toContain('No component matches')
})

test('insert picker searches, handles keyboard navigation and inserts a saved component', () => {
  store.savePreset({
    name: 'Saved action',
    description: '',
    nodes: store.parse('<s-button>Saved</s-button>').nodes,
  })
  store.openInsert({
    refId: null,
    zone: 'inside',
    x: 20,
    y: 20,
    source: 'tree',
  })

  const root = mount(() => <InsertPicker />)
  const search = input('[role="combobox"]', 'Saved action', root)

  search.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
  )
  search.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })
  )
  search.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
  )
  expect(toHTML(store.currentPage().nodes, store.catalog())).toContain(
    '>Saved</s-button>'
  )
  expect(store.editor.state.inserting).toBeNull()
})

test('export dialog copies generated code and reports clipboard failures', async () => {
  const copy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
  const root = mount(() => (
    <ExportDialog
      open
      onClose={() => {}}
    />
  ))
  const copyButton = [
    ...root.querySelectorAll<HTMLButtonElement>('button'),
  ].find(element => /Copy/.test(element.textContent))!

  copyButton.click()
  await vi.waitFor(() => expect(copy).toHaveBeenCalled())
  expect(copy.mock.calls[0]![0]).toContain('<!doctype html>')
  copy.mockRejectedValueOnce(new Error('Denied'))
  copyButton.click()
  await vi.waitFor(() =>
    expect(store.editor.state.toast?.message).toContain('blocked clipboard')
  )
  button('React JSX', root).click()
  expect(root.textContent).toContain('export default function')
})

test('dialogs react to open changes and backdrop clicks', () => {
  const [open, setOpen] = createSignal(false)
  const close = vi.fn(() => setOpen(false))
  const root = mount(() => (
    <NewPageDialog
      open={open()}
      onClose={close}
    />
  ))

  expect(root.querySelector('dialog')!.open).toBe(false)
  setOpen(true)
  expect(root.querySelector('dialog')!.open).toBe(true)
  root.querySelector('dialog')!.click()
  expect(close).toHaveBeenCalled()
  expect(root.querySelector('dialog')!.open).toBe(false)
})

test('export downloads HTML, untyped JSX and a ZIP containing every selected page', async () => {
  const blobs: Blob[] = []
  const createURL = vi
    .spyOn(URL, 'createObjectURL')
    .mockImplementation(blob => {
      blobs.push(blob as Blob)

      return 'blob:test'
    })

  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

  const downloads: string[] = []

  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement
  ) {
    downloads.push(this.download)
  })

  const root = mount(() => (
    <ExportDialog
      open
      onClose={() => {}}
    />
  ))

  submit(root)
  expect(downloads).toEqual(['test-page.html'])
  expect(await blobs[0]!.text()).toContain('<!doctype html>')
  button('React JSX', root).click()
  root.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click()
  submit(root)
  expect(downloads[1]).toBe('test-page.jsx')
  expect(await blobs[1]!.text()).not.toContain('reference types')
  store.addPage('Test page!', store.parse('<s-button>Second</s-button>').nodes)
  button('HTML', root).click()
  button('All (2)', root).click()

  const tabs = root.querySelectorAll<HTMLButtonElement>('[role="tab"]')

  expect([...tabs].map(tab => tab.textContent)).toEqual([
    'test-page.html',
    'test-page-2.html',
  ])
  tabs[1]!.click()
  expect(
    root.querySelector('[aria-label="Code preview"]')?.textContent
  ).toContain('Second')
  submit(root)
  await vi.waitFor(() => expect(downloads[2]).toBe('polaris-pages.zip'))

  const archive = unzipSync(new Uint8Array(await blobs[2]!.arrayBuffer()))

  expect(Object.keys(archive)).toEqual(['test-page.html', 'test-page-2.html'])
  expect(strFromU8(archive['test-page-2.html']!)).toContain('Second')
  expect(createURL).toHaveBeenCalledTimes(3)
})

test('sidebar menus rename, cancel, duplicate, export and delete pages', () => {
  const root = mount(() => (
    <DragDropProvider
      plugins={dndPlugins}
      sensors={dndSensors}
    >
      <Sidebar />
    </DragDropProvider>
  ))

  button('Rename', root).click()
  input('[aria-label="Page name"]', 'Renamed', root).dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
  )
  expect(store.currentPage().name).toBe('Renamed')
  button('Renamed', root).dispatchEvent(
    new MouseEvent('dblclick', { bubbles: true })
  )
  input('[aria-label="Page name"]', 'Cancelled', root).dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
  )
  expect(store.currentPage().name).toBe('Renamed')
  button('Duplicate', root).click()
  expect(store.currentPage().name).toBe('Renamed copy')

  const row = button('Renamed copy', root).closest('li')!

  button('Export page…', row).click()
  expect(root.querySelector('dialog[open]')?.textContent).toContain(
    'Export code'
  )
  button('Close', root.querySelector('dialog[open]')!).click()
  button('Delete', row).click()
  expect(store.editor.state.doc.pages).toHaveLength(1)
  expect(button('Delete', root).disabled).toBe(true)
})

test('saved palette components support insertion, replacement, editing and deletion', () => {
  const preset = store.savePreset({
    name: 'Reusable',
    description: '',
    nodes: store.currentPage().nodes,
  })!
  const root = mount(() => (
    <DragDropProvider
      plugins={dndPlugins}
      sensors={dndSensors}
    >
      <Sidebar />
    </DragDropProvider>
  ))

  button('Components', root).click()
  button('Reusable', root).click()
  expect(store.currentPage().nodes).toHaveLength(2)
  store.setAttr(selectedNode().id, 'heading', 'Replacement')
  button('Replace with selection', root).click()
  expect(toHTML(store.findPreset(preset.id)!.nodes, store.catalog())).toContain(
    'Replacement'
  )
  button('Edit name and description…', root).click()

  const dialog = root.querySelector('dialog[open]')!

  input('input', 'Renamed reusable', dialog)
  submit(dialog)
  expect(store.findPreset(preset.id)?.name).toBe('Renamed reusable')

  const search = input(
    '[aria-label="Search components"]',
    'Renamed reusable',
    root
  )
  const before = store.currentPage().nodes.length

  store.select(null)
  search.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
  )
  expect(store.currentPage().nodes).toHaveLength(before + 1)

  const actions = button('Actions for Renamed reusable', root).parentElement!

  button('Delete', actions).click()
  expect(store.editor.state.presets).toEqual([])
})

test('layers expand selection paths, hover actions, insertion gaps and show invalid drop markers', () => {
  const root = mount(() => (
    <DragDropProvider
      plugins={dndPlugins}
      sensors={dndSensors}
    >
      <Sidebar />
    </DragDropProvider>
  ))
  const section = selectedNode(store.currentPage().nodes[0]!.id)
  const child = section.children[0]!

  button('Collapse', root).click()
  expect(root.querySelector(`[data-tree-row="${child.id}"]`)).toBeNull()
  store.select(child.id)

  const row = root.querySelector<HTMLElement>(`[data-tree-row="${child.id}"]`)!

  expect(row).not.toBeNull()
  row.dispatchEvent(new PointerEvent('pointerenter'))
  expect(store.editor.state.hoveredId).toBe(child.id)
  row
    .querySelector<HTMLButtonElement>('[aria-label^="Duplicate Button"]')!
    .click()
  expect(selectedNode(section.id).children).toHaveLength(2)
  row.querySelector<HTMLButtonElement>('[aria-label^="Delete Button"]')!.click()
  expect(selectedNode(section.id).children).toHaveLength(1)

  const gap = root.querySelector<HTMLElement>('[data-insert-zone]')!

  gap.dispatchEvent(
    new PointerEvent('pointermove', { clientX: 32, bubbles: true })
  )
  gap.click()
  expect(store.editor.state.inserting?.source).toBe('tree')
  gap.dispatchEvent(new PointerEvent('pointerleave'))
  expect(store.editor.state.inserting).not.toBeNull()
  store.closeInsert()
  store.setDrag({
    label: 'Invalid',
    x: 0,
    y: 0,
    target: {
      parentId: section.id,
      refId: section.id,
      index: 0,
      zone: 'inside',
      slot: '',
      error: 'Invalid target',
    },
  })
  expect(
    root.querySelector(`[data-tree-row="${section.id}"]`)!.className
  ).toContain('ring-danger')
  store.setDrag(null)
  store.replacePage(
    store.parse(
      '<s-page><s-button slot="primary-action">Save</s-button></s-page><s-image></s-image><s-table-cell>Orphan</s-table-cell>'
    ).nodes
  )
  expect(
    root.querySelector('[title="In the “primary-action” slot"]')
  ).not.toBeNull()
  expect(root.querySelector('[role="tree"]')!.textContent).toContain('Orphan')
})

test('insert picker filters impossible placements, handles empty results and inserts by pointer', () => {
  store.savePreset({ name: 'Empty', description: '', nodes: [] })

  const section = store.currentPage().nodes[0]!

  store.openInsert({
    refId: section.id,
    zone: 'inside',
    x: 9000,
    y: 9000,
    source: 'tree',
  })

  const root = mount(() => <InsertPicker />)

  expect(root.textContent).toContain('Inside Section')

  const search = input('[role="combobox"]', 's-table-cell', root)

  expect(root.textContent).toContain('Nothing that matches can go here')
  expect(root.textContent).toContain('not allowed')

  for (const key of ['ArrowDown', 'ArrowUp', 'Enter', 'a']) {
    search.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  }

  expect(store.editor.state.inserting).not.toBeNull()
  input('[role="combobox"]', 's-button', root)

  const choice = root.querySelector<HTMLElement>('[role="option"]')!

  choice.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }))
  expect(choice.getAttribute('aria-selected')).toBe('true')
  choice.click()
  expect(selectedNode().tag).toBe('s-button')
  expect(selectedNode(section.id).children).toHaveLength(2)
  expect(store.editor.state.inserting).toBeNull()
})

test('popover menus position within the viewport and dismiss after an action', () => {
  const root = mount(() => (
    <Toolbar
      loadingVersion={false}
      agentReady={false}
    />
  ))
  const trigger = button('Theme', root)
  const popover = root.querySelector<HTMLElement>(
    `#${trigger.getAttribute('popovertarget')}`
  )!

  vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(-100, -100, 50, 50)
  )
  popover.showPopover()
  expect(popover.style.left).toBe('8px')
  expect(popover.style.top).toBe('8px')
  button('Dark', popover).click()
  expect(popover.matches(':popover-open')).toBe(false)
  expect(document.documentElement.classList.contains('dark')).toBe(true)
})
