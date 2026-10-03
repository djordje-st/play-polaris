// @vitest-environment happy-dom

import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { catalogs, resetEditor, selectedNode } from '../test/editor'
import { TEMPLATES } from '../polaris/library'
import { toHTML, exportPage, componentName, fileName } from './codegen'
import { locate, textOf } from './model'
import * as store from './store'

beforeEach(() => {
  vi.useFakeTimers()
  resetEditor('<s-button>Original</s-button>')
})

afterEach(() => {
  store.dismissToast()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('creates, renames, duplicates and deletes independent pages with undo', () => {
  const original = store.currentPage()
  const added = store.addPage(
    'Second',
    store.parse('<s-paragraph>Second</s-paragraph>').nodes
  )

  expect(store.currentPage()).toBe(added)
  store.renamePage(added.id, 'Renamed')
  store.duplicatePage(added.id)

  const copy = store.currentPage()

  expect(copy.name).toBe('Renamed copy')
  expect(copy.nodes[0]!.id).not.toBe(added.nodes[0]!.id)
  store.setText(copy.nodes[0]!.id, 'Copy only')
  expect(
    store.editor.state.doc.pages
      .find(page => page.id === added.id)!
      .nodes.map(textOf)
  ).toEqual(['Second'])
  store.deletePage(copy.id)
  expect(store.currentPage().id).toBe(added.id)
  store.undo()
  expect(store.editor.state.doc.pages.some(page => page.id === copy.id)).toBe(
    true
  )
  store.redo()
  store.deletePage(added.id)
  store.deletePage(original.id)
  expect(store.editor.state.doc.pages).toHaveLength(1)
  expect(store.editor.state.toast?.message).toContain('at least one page')
  store.duplicatePage('missing')
  expect(store.editor.state.doc.pages).toHaveLength(1)
})

test('names pages and presets case-insensitively without collisions', () => {
  store.addPage('New', [])
  store.addPage('new 2', [])
  expect(store.uniquePageName('NEW')).toBe('NEW 3')
  expect(store.uniquePageName('Unused')).toBe('Unused')

  for (const name of ['Block', 'block 2']) {
    store.savePreset({ name, description: '', nodes: [] })
  }

  expect(store.uniquePresetName('BLOCK')).toBe('BLOCK 3')
  expect(store.uniquePresetName('Other')).toBe('Other')
})

test.each(TEMPLATES.map(template => template.id))(
  'initializes the %s template and escapes page names',
  id => {
    const nodes = store.fromTemplate(id, 'A "quoted" <name>')
    const html = toHTML(nodes, catalogs.v1)

    expect(html).not.toContain('heading="A "quoted"')
    expect(store.fromTemplate('missing', 'Fallback')).toHaveLength(
      store.fromTemplate(TEMPLATES[0]!.id, 'Fallback').length
    )
  }
)

test('restores snapshots, falls back from removed pages, and clears old history', () => {
  const original = store.currentPage()

  store.setText(original.nodes[0]!.id, 'Changed')

  const other = store.addPage('Other', [])
  const snapshot = {
    ...store.snapshotOf(),
    pages: [original],
    pageId: original.id,
    version: 'v2' as const,
    viewport: 'mobile' as const,
  }

  store.applySnapshot(snapshot)
  expect(store.currentPage()).toBe(original)
  expect(store.editor.state.past).toEqual([])
  expect(store.editor.state.doc.version).toBe('v2')
  store.undo()
  store.redo()
  expect(store.currentPage()).toBe(original)
  store.applySnapshot({ ...snapshot, pages: [] })
  expect(store.currentPage()).toBe(original)
  store.initWorkspace({ ...snapshot, pageId: other.id }, catalogs.v2)
  expect(store.currentPage().id).toBe(original.id)
  store.initWorkspace(null, catalogs.v1)
  expect(store.currentPage().name).toBe('Home')
  expect(store.currentPage().nodes.length).toBeGreaterThan(0)
})

test('moves, nudges and removes nodes while keeping selection valid', () => {
  resetEditor(
    '<s-section><s-button>A</s-button><s-button>B</s-button></s-section>'
  )

  const parent = selectedNode(store.currentPage().nodes[0]!.id)
  const [a, b] = parent.children

  store.nudge(a!.id, -1)
  store.nudge(a!.id, 1)
  expect(selectedNode(parent.id).children.map(textOf)).toEqual(['B', 'A'])
  store.nudge(a!.id, 1)
  store.nudge('missing', 1)
  store.move(a!.id, { parentId: null, index: 1, slot: '' })
  expect(locate(store.currentPage().nodes, a!.id)?.parent).toBeNull()
  store.remove(a!.id)
  expect(store.editor.state.selectedId).toBe(parent.id)
  store.remove(b!.id)
  expect(store.editor.state.selectedId).toBe(parent.id)
  store.remove('missing')
  store.duplicate('missing')
  expect(store.currentPage().nodes).toHaveLength(1)
})

test('text and attribute removal survive undo and do not alter text-node attributes', () => {
  const button = store.currentPage().nodes[0]!
  const text = selectedNode(button.id).children[0]!

  store.setAttr(text.id, 'disabled', true)
  expect(store.editor.state.past).toHaveLength(0)
  store.setText(text.id, 'Text node')
  expect(textOf(store.currentPage().nodes[0]!)).toBe('Text node')
  store.setText(button.id, '')
  expect(selectedNode(button.id).children).toEqual([])
  store.setText(button.id, 'Restored')
  store.setAttr(button.id, 'disabled', true)
  store.setAttr(button.id, 'disabled', null)
  expect(selectedNode(button.id).attrs).not.toHaveProperty('disabled')
  store.setVersion('v2')
  store.undo()
  expect(store.editor.state.doc.version).toBe('v2')
})

test('updates and deletes saved snapshots with toast undo', () => {
  const preset = store.savePreset({
    name: 'Action',
    description: '',
    nodes: store.currentPage().nodes,
  })!

  store.updatePreset(preset.id, {
    name: 'Renamed',
    description: 'Description',
    nodes: store.parse('<s-button slot="primary-action">New</s-button>').nodes,
  })
  expect(store.findPreset(preset.id)).toMatchObject({
    name: 'Renamed',
    description: 'Description',
  })
  expect(toHTML(store.findPreset(preset.id)!.nodes, catalogs.v1)).not.toContain(
    'slot='
  )
  store.deletePreset('missing')
  store.deletePreset(preset.id)
  expect(store.findPreset(preset.id)).toBeUndefined()
  store.editor.state.toast!.action!.run()
  expect(store.findPreset(preset.id)?.name).toBe('Renamed')
  store.insertPreset('missing')
  expect(store.currentPage().nodes).toHaveLength(1)
})

test('view-only mode refuses document and saved component mutations', () => {
  const preset = store.savePreset({
    name: 'Action',
    description: '',
    nodes: store.currentPage().nodes,
  })!
  const id = store.currentPage().nodes[0]!.id

  store.setAccess('viewing')

  const snapshot = store.snapshotOf()

  store.setText(id, 'Forbidden')
  store.setAttr(id, 'disabled', true)
  store.remove(id)
  store.setVersion('v2')
  expect(
    store.savePreset({ name: 'Other', description: '', nodes: [] })
  ).toBeNull()
  store.updatePreset(preset.id, { name: 'Forbidden' })
  store.deletePreset(preset.id)
  expect(store.snapshotOf()).toEqual(snapshot)
})

test('transient state and notifications do not change the saved document', () => {
  const snapshot = store.snapshotOf()

  store.select('selected')
  store.select('selected')
  store.hover('hovered')
  store.setMode('interact')
  store.toggleCollapsed('selected')
  expect(store.editor.state.collapsed.selected).toBe(true)
  store.toggleCollapsed('selected')
  expect(store.editor.state.collapsed.selected).toBeUndefined()
  store.openInsert({ refId: null, zone: 'inside', x: 0, y: 0, source: 'tree' })
  store.closeInsert()
  store.closeInsert()
  store.setSaveState('error')
  store.setSaveState('error')
  store.notify('Done')
  vi.advanceTimersByTime(2800)
  expect(store.editor.state.toast).toBeNull()

  for (let i = 0; i < 35; i++) {
    store.logAgent('test', String(i), i % 2 === 0)
  }

  expect(store.editor.state.agentLog).toHaveLength(30)
  expect(store.editor.state.agentLog[0]?.detail).toBe('34')
  expect(store.snapshotOf()).toEqual(snapshot)
})

test('catalog loading retries failures and caches successful manifests', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({ ok: false, status: 503 })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ modules: [] }) })

  vi.stubGlobal('fetch', fetch)
  await expect(store.loadCatalog('v2')).rejects.toThrow('503')

  const result = await store.loadCatalog('v2')

  expect(result.version).toBe('v2')
  expect(await store.loadCatalog('v2')).toBe(result)
  expect(fetch).toHaveBeenCalledTimes(2)
  store.editor.setState(state => ({ ...state, catalog: null }))
  expect(() => store.catalog()).toThrow('not loaded')
})

test.each(['v1', 'v2'] as const)(
  'exports full documents and typed JSX for %s',
  version => {
    resetEditor(
      '<s-number-field label="Count" min={12} disabled={true}></s-number-field>',
      version
    )

    const options = {
      format: 'html' as const,
      document: true,
      appBridge: true,
      typescript: true,
    }
    const code = exportPage(
      { ...store.currentPage(), name: '<Title>' },
      version,
      catalogs[version],
      options
    )

    expect(code).toContain('<title>&lt;Title&gt;</title>')
    expect(code).toContain('app-bridge.js')
    expect(code).toContain(
      version === 'v1' ? 'polaris-1.js' : 'polaris-2.0-rc.js'
    )
    expect(
      exportPage(store.currentPage(), version, catalogs[version], {
        ...options,
        format: 'jsx',
      })
    ).toContain('min={12}')
    expect(
      exportPage(
        { ...store.currentPage(), nodes: [] },
        version,
        catalogs[version],
        { ...options, format: 'jsx', typescript: false }
      )
    ).toContain('return null')
    expect(componentName('123 name')).toBe('Page123Name')
    expect(componentName('')).toBe('UntitledPage')
    expect(componentName('Home Page')).toBe('HomePage')
    expect(fileName('!!!', options)).toBe('page.html')
    expect(
      fileName('Home', { ...options, format: 'jsx', typescript: false })
    ).toBe('home.jsx')
  }
)
