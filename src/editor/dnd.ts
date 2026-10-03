import {
  AutoScroller,
  Cursor,
  PointerActivationConstraints,
  PointerSensor,
  PreventSelection,
} from '@dnd-kit/dom'
import { displayName } from '../polaris/catalog'
import { isContainer, placementError, slotRule } from '../polaris/rules'
import { contains, isText, locate, pathTo, slotOf } from './model'
import {
  catalog,
  closeInsert,
  currentPage,
  editor,
  findPreset,
  hover,
  insertComponent,
  insertPreset,
  move,
  presetTags,
  setDrag,
} from './store'
import type { DragEndEvent, DragMoveEvent, DragStartEvent } from '@dnd-kit/dom'
import type { DropTarget } from './store'
import type { ElementNode } from './model'

// Polaris hosts can be display: contents, so slot-aware targeting replaces rectangle collisions.

export type DragData =
  | { kind: 'new'; tag: string }
  | { kind: 'preset'; id: string }
  | { kind: 'move'; id: string }

type CanvasHit = (
  x: number,
  y: number,
  tag: string,
  movingId: string | null
) => DropTarget | null

let canvasHit: CanvasHit | null = null

export function registerCanvasHit(fn: CanvasHit) {
  canvasHit = fn

  return () => {
    if (canvasHit === fn) {
      canvasHit = null
    }
  }
}

export function isHorizontal(parent: ElementNode | null) {
  if (!parent) {
    return false
  }

  return (
    parent.tag === 's-button-group' ||
    parent.tag === 's-table-row' ||
    parent.tag === 's-table-header-row' ||
    (parent.tag === 's-stack' && parent.attrs.direction === 'inline') ||
    (parent.tag === 's-grid' &&
      typeof parent.attrs.gridTemplateColumns === 'string' &&
      /\s/.test(parent.attrs.gridTemplateColumns.trim()))
  )
}

export function rootTarget(tag: string): DropTarget {
  const nodes = currentPage().nodes

  return {
    parentId: null,
    index: nodes.length,
    slot: '',
    zone: 'inside',
    refId: null,
    error: placementError(catalog(), null, '', tag),
  }
}

export function targetAt(
  refId: string,
  zone: DropTarget['zone'],
  tag: string,
  movingId: string | null
): DropTarget {
  const nodes = currentPage().nodes
  const loc = locate(nodes, refId)

  if (!loc) {
    return rootTarget(tag)
  }

  const inside = zone === 'inside' && !isText(loc.node)
  const parent = inside ? (loc.node as ElementNode) : loc.parent
  const index = inside
    ? (loc.node as ElementNode).children.length
    : loc.index + (zone === 'after' ? 1 : 0)
  // Adjacent drops inherit a sibling's slot only when that slot has capacity.

  const sibSlot = inside ? '' : slotOf(loc.node)
  const c = catalog()
  const max = parent ? slotRule(parent.tag, sibSlot)?.max : undefined
  const full =
    max !== undefined &&
    !!parent &&
    parent.children.filter(n => slotOf(n) === sibSlot && n.id !== movingId)
      .length >= max
  const slot =
    sibSlot && (full || placementError(c, parent?.tag ?? null, sibSlot, tag))
      ? ''
      : sibSlot

  let error = placementError(c, parent?.tag ?? null, slot, tag)

  if (movingId) {
    const moving = locate(nodes, movingId)?.node

    if (
      moving &&
      parent &&
      (parent.id === movingId || contains(moving, parent.id))
    ) {
      error = `Can't move ${displayName(moving.tag)} into itself`
    }
  }

  return {
    parentId: parent?.id ?? null,
    index,
    slot,
    zone: inside ? 'inside' : zone,
    refId,
    error,
  }
}

// Try ancestor edges when a small leaf cannot accept a drop inside it.
export function forgivingTarget(
  refId: string,
  zone: DropTarget['zone'],
  tag: string,
  movingId: string | null,
  preferAfter: boolean
) {
  const first = targetAt(refId, zone, tag, movingId)

  if (!first.error) {
    return first
  }

  const edge: DropTarget['zone'] = preferAfter ? 'after' : 'before'
  const path = pathTo(currentPage().nodes, refId) ?? []

  for (const [i, n] of [...path.entries()].reverse()) {
    const t = targetAt(
      n.id,
      i === path.length - 1 && zone !== 'inside' ? zone : edge,
      tag,
      movingId
    )

    if (!t.error) {
      return t
    }
  }

  return first
}

function treeTarget(
  row: HTMLElement,
  y: number,
  tag: string,
  movingId: string | null
): DropTarget {
  const id = row.dataset.treeRow!
  const node = locate(currentPage().nodes, id)?.node

  if (!node) {
    return rootTarget(tag)
  }

  const r = row.getBoundingClientRect()
  const t = (y - r.top) / r.height
  const container = !isText(node) && isContainer(catalog(), node.tag)
  const expanded =
    container &&
    !isText(node) &&
    node.children.length > 0 &&
    !editor.state.collapsed[id]

  if (container && t > 0.25 && t < 0.75) {
    const inside = targetAt(id, 'inside', tag, movingId)

    if (!inside.error) {
      return inside
    }

    return targetAt(id, t < 0.5 ? 'before' : 'after', tag, movingId)
  }

  const firstChild = expanded ? node.children[0] : undefined

  if (t >= 0.5 && firstChild) {
    return targetAt(firstChild.id, 'before', tag, movingId)
  }

  return targetAt(id, t < 0.5 ? 'before' : 'after', tag, movingId)
}

function hitTest(
  x: number,
  y: number,
  tag: string,
  movingId: string | null
): DropTarget | null {
  for (const el of document.elementsFromPoint(x, y)) {
    if (!(el instanceof HTMLElement)) {
      continue
    }

    const row = el.closest<HTMLElement>('[data-tree-row]')

    if (row) {
      return treeTarget(row, y, tag, movingId)
    }

    if (el.closest('[data-tree-root]')) {
      return rootTarget(tag)
    }

    if (el instanceof HTMLIFrameElement) {
      return canvasHit?.(x, y, tag, movingId) ?? null
    }

    if (el.closest('[data-canvas]')) {
      return rootTarget(tag)
    }
  }

  return null
}

// Accessibility would overwrite Polaris and tree ARIA; Feedback would move the source DOM.

export const dndPlugins = [AutoScroller, Cursor, PreventSelection]

// Distance-only activation prevents a slow click from becoming a drag.

export const dndSensors = [
  PointerSensor.configure({
    activationConstraints: () => [
      new PointerActivationConstraints.Distance({ value: 5 }),
    ],
  }),
]

export function allFit(t: DropTarget, tags: Array<string>): DropTarget {
  if (t.error || tags.length < 2) {
    return t
  }

  const parentTag = t.parentId
    ? (locate(currentPage().nodes, t.parentId)?.node.tag ?? null)
    : null
  const error = tags
    .slice(1)
    .map(tag => placementError(catalog(), parentTag, t.slot, tag))
    .find(Boolean)

  return error ? { ...t, error } : t
}

const subject = (data: unknown) => {
  const d = data as DragData | undefined

  if (!d) {
    return null
  }

  if (d.kind === 'preset') {
    const preset = findPreset(d.id)
    const tags = preset ? presetTags(preset) : []

    return preset && tags[0]
      ? { data: d, tags, label: preset.name, movingId: null }
      : null
  }

  const tag =
    d.kind === 'new' ? d.tag : locate(currentPage().nodes, d.id)?.node.tag

  return tag
    ? {
        data: d,
        tags: [tag],
        label: displayName(tag),
        movingId: d.kind === 'move' ? d.id : null,
      }
    : null
}

export function onDragStart(event: DragStartEvent) {
  const s = subject(event.operation.source?.data)

  if (!s) {
    return
  }

  const { x, y } = event.operation.position.current

  document.documentElement.classList.add('dragging')

  hover(null)
  closeInsert()
  setDrag({ label: s.label, x, y, target: null })
}

export function onDragMove(event: DragMoveEvent) {
  const s = subject(event.operation.source?.data)

  if (!s) {
    return
  }

  const { x, y } = event.operation.position.current
  const first = hitTest(x, y, s.tags[0]!, s.movingId)

  setDrag({ label: s.label, x, y, target: first && allFit(first, s.tags) })
}

export function onDragEnd(event: DragEndEvent) {
  document.documentElement.classList.remove('dragging')

  const target = editor.state.drag?.target

  setDrag(null)

  const s = subject(event.operation.source?.data)

  if (event.canceled || !s || !target || target.error) {
    return
  }

  if (s.data.kind === 'move') {
    move(s.data.id, target)
  } else if (s.data.kind === 'preset') {
    insertPreset(s.data.id, target)
  } else {
    insertComponent(s.data.tag, target)
  }
}
