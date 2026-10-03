// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import manifestV1 from 'polaris-types-v1/custom-elements?raw'
import manifestV2 from 'polaris-types-v2/custom-elements?raw'
import { buildCatalog } from '../polaris/catalog'
import { validate } from '../polaris/rules'
import { exportPage, toHTML } from './codegen'
import { locate } from './model'
import { createRenderer } from './renderer'
import {
  currentPage,
  dismissToast,
  duplicate,
  editor,
  initWorkspace,
  insertAt,
  insertComponent,
  insertPreset,
  parse,
  redo,
  remove,
  replacePage,
  savePreset,
  select,
  setAttr,
  setCatalog,
  setText,
  undo,
} from './store'
import type { Manifest } from '../polaris/catalog'

const initialState = editor.state

describe.each([
  ['v1', manifestV1],
  ['v2', manifestV2],
] as const)('editor integration (%s)', (version, manifest) => {
  const catalog = buildCatalog(version, JSON.parse(manifest) as Manifest)
  const html = () => toHTML(currentPage().nodes, catalog)

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    editor.setState(() => initialState)
    setCatalog(catalog)
    initWorkspace(
      {
        version,
        pages: [{ id: 'page', name: 'Test page', nodes: [] }],
        pageId: 'page',
        viewport: 'desktop',
        presets: [],
      },
      catalog
    )
  })

  afterEach(() => {
    dismissToast()
    vi.useRealTimers()
    editor.setState(() => initialState)
    document.body.replaceChildren()
  })

  test('imports JSX, renders edits, and groups typing into undo steps', () => {
    replacePage(
      parse('<s-button variant={"secondary"} disabled={false}>Save</s-button>')
        .nodes
    )

    const id = currentPage().nodes[0]!.id
    const original = '<s-button variant="secondary">Save</s-button>'
    const renderer = createRenderer(document)

    expect(html()).toBe(original)
    renderer.render(currentPage().nodes, catalog)

    const button = document.querySelector('s-button')!

    expect(button.textContent).toBe('Save')
    setText(id, 'Save draft')
    vi.advanceTimersByTime(100)
    setText(id, 'Save changes')
    renderer.render(currentPage().nodes, catalog)

    expect(document.querySelector('s-button')).toBe(button)
    expect(button.textContent).toBe('Save changes')
    expect(html()).toContain('>Save changes</s-button>')

    undo()
    renderer.render(currentPage().nodes, catalog)
    expect(button.textContent).toBe('Save')
    expect(html()).toBe(original)

    redo()
    expect(html()).toContain('>Save changes</s-button>')

    vi.advanceTimersByTime(1600)
    setText(id, 'Publish')
    undo()
    expect(html()).toContain('>Save changes</s-button>')

    setAttr(id, 'disabled', true)
    redo()
    renderer.render(currentPage().nodes, catalog)
    expect(button.hasAttribute('disabled')).toBe(true)
    expect(button.textContent).toBe('Save changes')
    expect(
      exportPage(currentPage(), version, catalog, {
        format: 'jsx',
        document: false,
        appBridge: false,
        typescript: true,
      })
    ).toMatch(
      /<s-button\s+variant="secondary"\s+disabled\s*>\s*Save changes\s*<\/s-button>/
    )
  })

  test('removes unsafe import content while preserving supported markup', () => {
    const imported = parse(`
      <div>
        <s-button disabled={true} onclick="alert(1)" href="javascript:alert(1)">
          Save &amp; close
        </s-button>
        <script>alert('unsafe')</script>
        <iframe src="https://example.com"></iframe>
      </div>
    `)

    expect(imported.skipped).toEqual(
      expect.arrayContaining([
        '<div>',
        '<script>',
        '<iframe>',
        'onclick on <s-button>',
        'href on <s-button>',
      ])
    )
    replacePage(imported.nodes)
    expect(html()).toBe('<s-button disabled>Save &amp; close</s-button>')
    expect(validate(catalog, currentPage().nodes)).toEqual([])
  })

  test('inserts into the selected container and rejects invalid placement', () => {
    replacePage(parse('<s-section heading="Actions"></s-section>').nodes)

    const sectionId = currentPage().nodes[0]!.id

    select(sectionId)
    insertComponent('s-button')

    const button = locate(currentPage().nodes, editor.state.selectedId!)!

    expect(button.node.tag).toBe('s-button')
    expect(button.parent?.id).toBe(sectionId)
    expect(validate(catalog, currentPage().nodes)).toEqual([])

    const before = html()

    insertComponent('s-table-cell')
    expect(html()).toBe(before)
    expect(editor.state.toast).toMatchObject({
      tone: 'critical',
      message: expect.stringContaining('must be placed directly inside'),
    })
  })

  test('revalidates slot capacity and property values after edits and undo', () => {
    replacePage(parse('<s-page heading="Products"></s-page>').nodes)

    const [button] = insertAt(parse('<s-button>Save</s-button>').nodes, {
      parentId: currentPage().nodes[0]!.id,
      index: 0,
      slot: 'primary-action',
    })

    expect(validate(catalog, currentPage().nodes)).toEqual([])
    duplicate(button!.id)

    const copyId = editor.state.selectedId!

    expect(validate(catalog, currentPage().nodes)).toEqual([
      expect.objectContaining({
        id: copyId,
        level: 'error',
        message: expect.stringContaining('holds at most 1'),
      }),
    ])
    remove(copyId)
    expect(validate(catalog, currentPage().nodes)).toEqual([])
    undo()
    expect(validate(catalog, currentPage().nodes)).toHaveLength(1)
    redo()
    expect(validate(catalog, currentPage().nodes)).toEqual([])

    setAttr(button!.id, 'variant', 'invalid')
    expect(validate(catalog, currentPage().nodes)).toContainEqual(
      expect.objectContaining({
        id: button!.id,
        level: 'error',
        message: expect.stringContaining("isn't a valid variant"),
      })
    )
    setAttr(button!.id, 'variant', 'primary')
    expect(validate(catalog, currentPage().nodes)).toEqual([])
  })

  test('inserts independent saved components with working command references', () => {
    const preset = savePreset({
      name: 'Details dialog',
      description: '',
      nodes: parse(`
        <s-button commandFor="details">Details</s-button>
        <s-modal id="details" heading="Details">
          <s-paragraph>Details body</s-paragraph>
        </s-modal>
      `).nodes,
    })!

    insertPreset(preset.id)

    const firstButtonId = editor.state.selectedId!

    select(null)
    insertPreset(preset.id)
    setText(firstButtonId, 'Changed')

    const output = document.createElement('template')

    output.innerHTML = html()

    const buttons = [...output.content.querySelectorAll('s-button')]
    const modals = [...output.content.querySelectorAll('s-modal')]

    expect(buttons.map(button => button.textContent)).toEqual([
      'Changed',
      'Details',
    ])
    expect(modals).toHaveLength(2)
    expect(new Set(modals.map(modal => modal.id)).size).toBe(2)
    expect(buttons.map(button => button.getAttribute('commandfor'))).toEqual(
      modals.map(modal => modal.id)
    )
    expect(toHTML(preset.nodes, catalog)).toContain('>Details</s-button>')
    expect(validate(catalog, currentPage().nodes)).toEqual([])
  })
})
