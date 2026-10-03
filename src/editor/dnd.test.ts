// @vitest-environment happy-dom

import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { resetEditor, selectedNode } from '../test/editor'
import {
  currentPage,
  dismissToast,
  editor,
  savePreset,
  parse,
  toggleCollapsed,
} from './store'
import {
  allFit,
  forgivingTarget,
  isHorizontal,
  onDragEnd,
  onDragMove,
  onDragStart,
  registerCanvasHit,
  rootTarget,
  targetAt,
} from './dnd'
import type { DragEndEvent, DragMoveEvent, DragStartEvent } from '@dnd-kit/dom'
import type { DragData } from './dnd'

const event = (data?: DragData, canceled = false) =>
  ({
    operation: { source: { data }, position: { current: { x: 20, y: 50 } } },
    canceled,
  }) as unknown as DragStartEvent & DragMoveEvent & DragEndEvent

beforeEach(() => {
  resetEditor(
    '<s-page><s-section><s-button>A</s-button></s-section><s-button slot="primary-action">Save</s-button></s-page>'
  )
  // happy-dom has no layout hit testing; supply the geometry boundary only.
  document.elementsFromPoint = () => []
})
afterEach(() => {
  vi.restoreAllMocks()
  dismissToast()
  document.body.replaceChildren()
  document.documentElement.classList.remove('dragging')
})

test('targets edges, container interiors and full named slots', () => {
  const page = selectedNode(currentPage().nodes[0]!.id)
  const section = selectedNode(page.children[0]!.id)
  const action = page.children[1]!

  expect(targetAt(section.id, 'inside', 's-button', null)).toMatchObject({
    parentId: section.id,
    index: 1,
    error: null,
  })
  expect(targetAt(section.id, 'before', 's-button', null)).toMatchObject({
    parentId: page.id,
    index: 0,
  })
  expect(targetAt(action.id, 'after', 's-button', null).slot).toBe('')
  expect(targetAt(action.id, 'after', 's-button', action.id).slot).toBe(
    'primary-action'
  )
  expect(targetAt('missing', 'inside', 's-button', null)).toEqual(
    rootTarget('s-button')
  )
  expect(targetAt(section.id, 'inside', 's-page', page.id).error).toContain(
    'into itself'
  )
  expect(
    forgivingTarget(section.children[0]!.id, 'inside', 's-button', null, true)
      .parentId
  ).toBe(section.id)
  expect(
    forgivingTarget(
      section.children[0]!.id,
      'inside',
      's-table-cell',
      null,
      false
    ).error
  ).not.toBeNull()
  expect(
    allFit(targetAt(section.id, 'inside', 's-button', null), [
      's-button',
      's-table-cell',
    ]).error
  ).toContain('directly inside')
})

test.each([
  ['<s-stack direction="inline"></s-stack>', true],
  ['<s-stack></s-stack>', false],
  ['<s-grid gridTemplateColumns="1fr 1fr"></s-grid>', true],
  ['<s-button-group></s-button-group>', true],
])('identifies horizontal layout %s', (html, expected) => {
  resetEditor(html)
  expect(isHorizontal(selectedNode(currentPage().nodes[0]!.id))).toBe(expected)
  expect(isHorizontal(null)).toBe(false)
})

test('drag events insert at the root, cancel cleanly, and ignore missing sources', () => {
  const root = document.createElement('div')

  root.dataset.treeRoot = ''
  document.body.append(root)
  vi.spyOn(document, 'elementsFromPoint').mockReturnValue([root])

  const drag = event({ kind: 'new', tag: 's-button' })

  onDragStart(drag)
  expect(document.documentElement.classList.contains('dragging')).toBe(true)
  onDragMove(drag)
  expect(editor.state.drag?.target?.parentId).toBeNull()
  onDragEnd(drag)
  expect(currentPage().nodes).toHaveLength(2)
  expect(editor.state.drag).toBeNull()
  onDragStart(drag)
  onDragMove(drag)
  onDragEnd(event({ kind: 'new', tag: 's-button' }, true))
  expect(currentPage().nodes).toHaveLength(2)
  onDragStart(event())
  onDragMove(event({ kind: 'move', id: 'missing' }))
  onDragEnd(event({ kind: 'preset', id: 'missing' }))
  expect(editor.state.drag).toBeNull()
})

test('tree hit testing and iframe delegation move nodes and insert presets', () => {
  const page = selectedNode(currentPage().nodes[0]!.id)
  const section = selectedNode(page.children[0]!.id)
  const row = document.createElement('div')

  row.dataset.treeRow = section.id
  document.body.append(row)
  vi.spyOn(row, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, 100, 100)
  )

  const hits = vi.spyOn(document, 'elementsFromPoint').mockReturnValue([row])
  const drag = event({ kind: 'move', id: page.children[1]!.id })

  onDragStart(drag)
  onDragMove(drag)
  onDragEnd(drag)
  expect(selectedNode(section.id).children).toHaveLength(2)

  const iframe = document.createElement('iframe')

  hits.mockReturnValue([iframe])

  const hit = vi.fn(() => rootTarget('s-button'))
  const off = registerCanvasHit(hit)
  const preset = savePreset({
    name: 'Action',
    description: '',
    nodes: parse('<s-button>Preset</s-button>').nodes,
  })!
  const saved = event({ kind: 'preset', id: preset.id })

  onDragStart(saved)
  onDragMove(saved)
  expect(hit).toHaveBeenCalledWith(20, 50, 's-button', null)
  onDragEnd(saved)
  expect(currentPage().nodes).toHaveLength(2)
  off()
  onDragMove(saved)
  expect(editor.state.drag?.target).toBeNull()
})

test('tree edge targeting respects expansion and rejects incompatible children', () => {
  const section = selectedNode(
    selectedNode(currentPage().nodes[0]!.id).children[0]!.id
  )
  const row = document.createElement('div')

  row.dataset.treeRow = section.id
  document.body.append(row)

  const bounds = vi
    .spyOn(row, 'getBoundingClientRect')
    .mockReturnValue(new DOMRect(0, 45, 100, 100))

  vi.spyOn(document, 'elementsFromPoint').mockReturnValue([row])

  const drag = event({ kind: 'new', tag: 's-button' })

  onDragMove(drag)
  expect(editor.state.drag?.target).toMatchObject({
    refId: section.id,
    zone: 'before',
  })
  bounds.mockReturnValue(new DOMRect(0, -40, 100, 100))
  onDragMove(drag)
  expect(editor.state.drag?.target).toMatchObject({
    refId: section.children[0]!.id,
    zone: 'before',
  })
  toggleCollapsed(section.id)
  onDragMove(drag)
  expect(editor.state.drag?.target).toMatchObject({
    refId: section.id,
    zone: 'after',
  })
  bounds.mockReturnValue(new DOMRect(0, 5, 100, 100))
  onDragMove(event({ kind: 'new', tag: 's-table-cell' }))
  expect(editor.state.drag?.target?.error).toContain('directly inside')
  expect(editor.state.drag?.target?.zone).toBe('before')
  row.dataset.treeRow = 'removed'
  onDragMove(drag)
  expect(editor.state.drag?.target?.parentId).toBeNull()
})

test('empty canvas targeting skips SVG hits and clears when outside the editor', () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const canvas = document.createElement('div')

  canvas.dataset.canvas = ''

  const hits = vi
    .spyOn(document, 'elementsFromPoint')
    .mockReturnValue([svg, canvas])
  const drag = event({ kind: 'new', tag: 's-button' })

  onDragMove(drag)
  expect(editor.state.drag?.target?.parentId).toBeNull()
  hits.mockReturnValue([document.body])
  onDragMove(drag)
  expect(editor.state.drag?.target).toBeNull()
})
