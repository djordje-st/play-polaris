// @vitest-environment happy-dom

import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { resetEditor, selectedNode } from '../test/editor'
import { currentPage, dismissToast, editor, select, setAccess } from './store'
import { modelContext, registerWebMCP, TOOL_NAMES } from './webmcp'
import * as preview from './preview'

type Tool = Parameters<NonNullable<Document['modelContext']>['registerTool']>[0]

const tools = new Map<string, Tool>()
let unregister: (() => void) | null
const invoke = (name: string, input?: Record<string, unknown>) =>
  tools.get(name)!.execute(input)

beforeEach(() => {
  resetEditor('<s-section><s-button>Original</s-button></s-section>')
  tools.clear()
  document.modelContext = {
    registerTool: tool => tools.set(tool.name, tool),
    unregisterTool: name => tools.delete(name),
  }
  unregister = registerWebMCP()
})

afterEach(() => {
  unregister?.()
  delete document.modelContext
  delete navigator.modelContext
  dismissToast()
  vi.restoreAllMocks()
})

test('registers all tools, prefers document context, and cleans up', () => {
  expect([...tools.keys()]).toEqual(TOOL_NAMES.map(tool => tool.name))
  expect(modelContext()).toBe(document.modelContext)
  unregister!()
  expect(tools.size).toBe(0)
  delete document.modelContext
  expect(registerWebMCP()).toBeNull()
  navigator.modelContext = { registerTool: vi.fn() }
  expect(modelContext()).toBe(navigator.modelContext)
})

test('reads workspace, catalog references, pages and exports', async () => {
  expect((await invoke('get_workspace')).content[0].text).toContain('Test page')
  expect(
    (await invoke('list_components', { category: 'Layout' })).content[0].text
  ).toContain('s-section')

  for (const tag of ['s-button', 's-page', 's-text-field', 's-table-cell']) {
    const result = await invoke('get_component', { tag })

    expect(result.isError).toBeUndefined()
    expect(result.content[0].text).toContain(tag)
  }

  expect((await invoke('get_page')).content[0].text).toContain('Original')
  expect((await invoke('validate_page')).content[0].text).toContain(
    '"valid": true'
  )
  expect(
    (await invoke('export_code', { format: 'html', document: true })).content[0]
      .text
  ).toContain('<!doctype html>')
  expect(
    (await invoke('export_code', { format: 'jsx' })).content[0].text
  ).toContain('export default function')
})

test('page creation, renaming, opening, replacing and deletion use the live store', async () => {
  const original = currentPage().id

  await invoke('create_page', { name: 'New', template: 'blank' })

  const created = currentPage().id

  expect(editor.state.doc.pages).toHaveLength(2)
  await invoke('rename_page', { pageId: created, name: 'Renamed' })
  expect(currentPage().name).toBe('Renamed')
  await invoke('set_page_html', {
    pageId: created,
    html: '<s-paragraph>Replaced</s-paragraph>',
  })
  expect(currentPage().nodes[0]!.tag).toBe('s-paragraph')
  await invoke('open_page', { pageId: original })
  expect(currentPage().id).toBe(original)
  await invoke('delete_page', { pageId: created })
  expect(editor.state.doc.pages).toHaveLength(1)
  expect((await invoke('delete_page', { pageId: original })).isError).toBe(true)
  await invoke('create_page', {
    name: 'Imported',
    html: '<div><s-button>Import</s-button></div>',
  })
  expect(currentPage().nodes[0]!.tag).toBe('s-button')
})

test('inserts, updates, moves, selects and removes components', async () => {
  const section = selectedNode(currentPage().nodes[0]!.id)

  await invoke('insert_html', {
    html: '<s-button>Added</s-button>',
    parentId: section.id,
    index: 0,
  })

  const id = editor.state.selectedId!

  expect(selectedNode(section.id).children[0]!.id).toBe(id)
  await invoke('update_node', {
    id,
    attrs: {
      disabled: true,
      variant: 'primary',
      href: null,
      loading: false,
      'data-count': 2,
    },
    text: 'Updated',
  })
  expect(selectedNode(id).attrs).toMatchObject({
    disabled: true,
    variant: 'primary',
    'data-count': '2',
  })
  expect(selectedNode(id).attrs).not.toHaveProperty('loading')

  const textId = selectedNode(id).children[0]!.id

  await invoke('update_node', { id: textId, text: 'Text update' })
  await invoke('move_node', { id, parentId: null, index: 0 })
  expect(currentPage().nodes[0]!.id).toBe(id)
  select(null)
  await invoke('select_node', { id })
  expect(editor.state.selectedId).toBe(id)
  await invoke('remove_node', { id })
  expect(currentPage().nodes.some(node => node.id === id)).toBe(false)
  expect(editor.state.agentLog[0]?.ok).toBe(true)
})

test('saves markup and selected nodes with duplicate-name protection', async () => {
  await invoke('save_component', {
    name: 'Markup',
    description: 'Reusable',
    html: '<s-button>Saved</s-button>',
  })
  await invoke('save_component', {
    name: 'Selected',
    nodeId: currentPage().nodes[0]!.id,
  })
  expect(editor.state.presets).toHaveLength(2)
  expect((await invoke('list_saved_components')).content[0].text).toContain(
    'Reusable'
  )
  expect(
    (
      await invoke('save_component', {
        name: 'MARKUP',
        html: '<s-button>Duplicate</s-button>',
      })
    ).isError
  ).toBe(true)
  await invoke('set_polaris_version', { version: 'v2' })
  expect(editor.state.doc.version).toBe('v2')
  expect((await invoke('get_workspace')).content[0].text).toContain(
    'release candidate'
  )
})

test('preview controls validate before changing state and report missing previews', async () => {
  expect(
    (await invoke('set_preview', { viewport: 'mobile', mode: 'invalid' }))
      .isError
  ).toBe(true)
  expect(editor.state.viewport).toBe('desktop')
  await invoke('set_preview', { viewport: 'mobile', mode: 'interact' })
  expect(editor.state).toMatchObject({ viewport: 'mobile', mode: 'interact' })
  await invoke('set_preview', { viewport: 'tablet' })
  await invoke('set_preview', { mode: 'design' })
  expect(editor.state).toMatchObject({ viewport: 'tablet', mode: 'design' })
  expect(
    JSON.parse((await invoke('inspect_preview')).content[0].text)
  ).toMatchObject({ state: 'unavailable', ready: false })
})

test('duplicates preserve originals, remap ids and use shared undo/redo', async () => {
  resetEditor(
    '<s-section><s-button commandFor="dialog">Open</s-button><s-modal id="dialog" heading="Details"></s-modal></s-section>'
  )

  const original = currentPage()
  const id = original.nodes[0]!.id

  expect(JSON.parse((await invoke('undo')).content[0].text).changed).toBe(false)
  expect(JSON.parse((await invoke('redo')).content[0].text).changed).toBe(false)

  const copy = JSON.parse(
    (await invoke('duplicate_node', { id })).content[0].text
  )

  expect(copy.id).not.toBe(id)

  const copied = selectedNode(copy.id)

  expect(copied.children[0]!.id).not.toBe(selectedNode(id).children[0]!.id)
  expect(selectedNode(copied.children[0]!.id).attrs.commandFor).toBe(
    selectedNode(copied.children[1]!.id).attrs.id
  )
  expect(selectedNode(copied.children[1]!.id).attrs.id).not.toBe('dialog')
  expect(currentPage().nodes[0]).toBe(original.nodes[0])
  expect(JSON.parse((await invoke('undo')).content[0].text)).toMatchObject({
    changed: true,
    canUndo: false,
    canRedo: true,
  })
  expect(currentPage().nodes).toHaveLength(1)
  await invoke('redo')
  expect(currentPage().nodes).toHaveLength(2)
  await invoke('duplicate_page', { pageId: original.id })
  expect(currentPage().id).not.toBe(original.id)
  expect(currentPage().name).toBe('Test page copy')
  expect(currentPage().nodes[0]!.id).not.toBe(id)
  await invoke('undo')
  expect(currentPage().id).toBe(original.id)
  expect(editor.state.doc.pages).toHaveLength(1)
})

test('finds components with combined filters, parent ids and bounded results', async () => {
  resetEditor(
    '<s-section><s-button id="save" variant="primary" disabled>Save changes</s-button><s-button>Cancel</s-button></s-section>'
  )

  const found = JSON.parse(
    (
      await invoke('find_nodes', {
        tag: 'S-BUTTON',
        text: 'SAVE',
        attrs: { VARIANT: 'primary', disabled: true },
      })
    ).content[0].text
  )

  expect(found).toMatchObject({
    total: 1,
    truncated: false,
    matches: [{ parentId: currentPage().nodes[0]!.id, text: 'Save changes' }],
  })

  const enabled = JSON.parse(
    (
      await invoke('find_nodes', {
        tag: 's-button',
        attrs: { disabled: false },
      })
    ).content[0].text
  )

  expect(enabled.matches.map((n: { text: string }) => n.text)).toEqual([
    'Cancel',
  ])
  expect(
    JSON.parse((await invoke('find_nodes', { limit: 1 })).content[0].text)
  ).toMatchObject({ total: 3, truncated: true, matches: [{ parentId: null }] })
  expect(
    JSON.parse(
      (await invoke('find_nodes', { text: 'missing' })).content[0].text
    ).matches
  ).toEqual([])
  expect(
    JSON.parse(
      (await invoke('find_nodes', { attrs: { id: 'missing' } })).content[0].text
    ).matches
  ).toEqual([])
})

test('awaits screenshot results, preserves image content, and logs async failures', async () => {
  const capture = vi.spyOn(preview, 'screenshotPreview').mockResolvedValue({
    pageId: 'page',
    pageName: 'Test page',
    nodeId: undefined,
    viewport: 'desktop',
    width: 390,
    height: 640,
    warnings: [],
    data: 'cG5n',
  })

  setAccess('viewing')

  const result = await invoke('screenshot_preview')

  expect(result.content[1]).toEqual({
    type: 'image',
    mimeType: 'image/png',
    data: 'cG5n',
  })
  expect(JSON.parse(result.content[0].text)).toMatchObject({
    width: 390,
    height: 640,
  })
  expect(result.content[0].text).not.toContain('cG5n')
  await invoke('screenshot_preview', { nodeId: currentPage().nodes[0]!.id })
  expect(capture).toHaveBeenLastCalledWith(currentPage().nodes[0]!.id)
  capture.mockRejectedValue(new Error('Capture failed'))
  expect((await invoke('screenshot_preview')).isError).toBe(true)
  expect(editor.state.agentLog[0]).toMatchObject({ ok: false })
})

test.each([
  ['get_component', { tag: 'unknown' }],
  ['get_component', { tag: '' }],
  ['open_page', { pageId: 'missing' }],
  ['open_page', { pageId: 1 }],
  ['insert_html', { html: '<script>bad</script>' }],
  ['insert_html', { html: '<s-button>A</s-button>', parentId: 'missing' }],
  ['update_node', { id: 'missing' }],
  ['remove_node', { id: 'missing' }],
  ['select_node', { id: 'missing' }],
  ['move_node', { id: 'missing', parentId: null }],
  ['save_component', { name: 'Empty', html: '<div></div>' }],
  ['save_component', { name: 'Missing', nodeId: 'missing' }],
  ['export_code', { format: 'unknown' }],
  ['set_polaris_version', { version: 'v3' }],
  ['set_preview', {}],
  ['set_preview', { viewport: 'wide' }],
  ['set_preview', { mode: 'edit' }],
  ['duplicate_node', { id: 'missing' }],
  ['duplicate_page', { pageId: 'missing' }],
  ['screenshot_preview', { nodeId: 'missing' }],
  ['find_nodes', { limit: 0 }],
  ['find_nodes', { limit: 201 }],
  ['find_nodes', { limit: 1.5 }],
  ['find_nodes', { limit: '10' }],
  ['find_nodes', { limit: null }],
  ['find_nodes', { attrs: null }],
  ['find_nodes', { attrs: [] }],
  ['find_nodes', { attrs: { disabled: 1 } }],
  ['find_nodes', { attrs: { '': true } }],
] as const)('%s rejects invalid input', async (name, input) => {
  const result = await invoke(name, input)

  expect(result.isError).toBe(true)
  expect(result.content[0].text).not.toContain('Unexpected error')
  expect(editor.state.agentLog[0]?.ok).toBe(false)
})

test('validates node update shapes and insertion parents', async () => {
  const id = currentPage().nodes[0]!.id
  const textId = selectedNode(selectedNode(id).children[0]!.id).children[0]!.id

  expect((await invoke('duplicate_node', { id: textId })).isError).toBe(true)
  expect((await invoke('screenshot_preview', { nodeId: textId })).isError).toBe(
    true
  )

  for (const input of [
    { id, attrs: null },
    { id, attrs: 42 },
    { id, attrs: { onclick: 'bad' } },
    { id: textId, attrs: {} },
  ]) {
    expect((await invoke('update_node', input)).isError).toBe(true)
  }

  expect((await invoke('move_node', { id, parentId: 'missing' })).isError).toBe(
    true
  )
  expect(
    (
      await invoke('insert_html', {
        html: '<s-button>A</s-button>',
        parentId: textId,
      })
    ).isError
  ).toBe(true)
})

test('all write tools refuse execution in a view-only tab', async () => {
  setAccess('viewing')

  for (const tool of TOOL_NAMES.filter(entry => !entry.readOnly)) {
    const result = await invoke(tool.name, {})

    expect(result.isError, tool.name).toBe(true)
    expect(result.content[0].text, tool.name).toContain('view-only')
  }

  expect((await invoke('get_workspace')).isError).toBeUndefined()
})

test('registration failures are contained and cleanup tolerates removed tools', async () => {
  unregister!()

  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

  document.modelContext = {
    registerTool: vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('sync')
      })
      .mockRejectedValue(new Error('async')),
    unregisterTool: () => {
      throw new Error('already removed')
    },
  }
  unregister = registerWebMCP()
  await Promise.resolve()
  expect(warn).toHaveBeenCalledTimes(TOOL_NAMES.length)
  expect(() => unregister!()).not.toThrow()
})
