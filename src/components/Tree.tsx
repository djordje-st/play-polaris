import {
  For,
  Show,
  createEffect,
  createMemo,
  createSelector,
  createSignal,
  untrack,
} from 'solid-js'
import { useSelector } from '@tanstack/solid-store'
import { useDraggable } from '@dnd-kit/solid'
import { displayName } from '../polaris/catalog'
import { entryFor } from '../polaris/library'
import { validate } from '../polaris/rules'
import {
  boundaryOptions,
  isText,
  pathTo,
  slotOf,
  textOf,
  textOnly,
  visibleRows,
} from '../editor/model'
import {
  currentPage,
  duplicate,
  editor,
  hover,
  openInsert,
  remove,
  select,
  toggleCollapsed,
} from '../editor/store'
import { modKey } from '../editor/shortcuts'
import { Icon, IconButton } from './ui'
import type { Accessor } from 'solid-js'
import type { IconName } from './ui'
import type { DragData } from '../editor/dnd'
import type { Issue } from '../polaris/rules'
import type { Row, TreeNode } from '../editor/model'

const CATEGORY_ICON: Record<string, IconName> = {
  Layout: 'layout',
  Text: 'text',
  Actions: 'action',
  Forms: 'form',
  Tables: 'table',
  Feedback: 'feedback',
  Media: 'media',
  Overlays: 'overlay',
}

export const iconFor = (tag: string): IconName =>
  tag === '#text'
    ? 'quote'
    : (CATEGORY_ICON[entryFor(tag)?.category ?? ''] ?? 'blocks')

function hint(n: TreeNode) {
  if (isText(n)) {
    return n.text
  }

  if (textOnly(n)) {
    return textOf(n)
  }

  const a = n.attrs
  const v =
    a.heading ?? a.label ?? a.accessibilityLabel ?? a.type ?? a.alt ?? a.id

  return typeof v === 'string' ? v : ''
}

const indent = (depth: number) => 6 + depth * 14

type DropMark = {
  id: string
  zone: 'before' | 'after' | 'inside'
  bad: boolean
}

// Share store subscriptions; createSelector wakes only rows whose answer changed.
type TreeContext = {
  rows: Accessor<Array<Row>>
  isSelected: (id: string) => boolean
  isHovered: (id: string) => boolean
  isPickerAt: (gapKey: string) => boolean
  dropAt: (id: string) => DropMark | null
}

const sameIds = (a: Array<string>, b: Array<string>) =>
  a.length === b.length && a.every((id, i) => id === b[i])

const sameIssues = (a?: Array<Issue>, b?: Array<Issue>) =>
  a === b ||
  (!!a &&
    !!b &&
    a.length === b.length &&
    a.every((x, i) => x.level === b[i]!.level && x.message === b[i]!.message))

export function Tree() {
  const nodes = useSelector(editor, s => currentPage(s).nodes)
  const collapsed = useSelector(editor, s => s.collapsed)
  const catalog = useSelector(editor, s => s.catalog)
  const selectedId = useSelector(editor, s => s.selectedId)
  const hoveredId = useSelector(editor, s => s.hoveredId)
  const pickerKey = useSelector(editor, s => s.inserting?.key ?? null)
  const drop = useSelector(
    editor,
    (s): DropMark | null => {
      const ins = s.inserting?.source === 'canvas' ? s.inserting : null
      const t =
        s.drag?.target ??
        (ins && {
          zone: ins.zone,
          refId: ins.refId,
          parentId: ins.zone === 'inside' ? ins.refId : null,
          error: null,
        })
      const id = t && (t.zone === 'inside' ? t.parentId : t.refId)

      return t && id ? { id, zone: t.zone, bad: !!t.error } : null
    },
    {
      compare: (a, b) =>
        a?.id === b?.id && a?.zone === b?.zone && a?.bad === b?.bad,
    }
  )
  const isDropRow = createSelector(() => drop()?.id)

  // Reuse row objects so bindings update only when their inputs change.

  let previous = new Map<string, Row>()
  const rows = createMemo(() => {
    const byId = new Map<string, Row>()
    const list = visibleRows(nodes(), collapsed()).map(r => {
      const prev = previous.get(r.node.id)
      const row =
        prev &&
        prev.node === r.node &&
        prev.depth === r.depth &&
        prev.expanded === r.expanded &&
        prev.expandable === r.expandable
          ? prev
          : r

      byId.set(r.node.id, row)

      return row
    })

    previous = byId

    return { list, byId }
  })
  // Key by id so immutable edits do not remount the entire ancestor chain.

  const ids = createMemo(() => rows().list.map(r => r.node.id), [], {
    equals: sameIds,
  })

  const issues = createMemo(() => {
    const byNode = new Map<string, Array<Issue>>()
    const c = catalog()

    if (!c) {
      return byNode
    }

    for (const issue of validate(c, nodes())) {
      const list = byNode.get(issue.id)

      if (list) {
        list.push(issue)
      } else {
        byNode.set(issue.id, [issue])
      }
    }

    return byNode
  })

  const tree: TreeContext = {
    rows: () => rows().list,
    isSelected: createSelector(selectedId),
    isHovered: createSelector(hoveredId),
    isPickerAt: createSelector(pickerKey),
    dropAt: id => (isDropRow(id) ? drop() : null),
  }

  createEffect(() => {
    const id = selectedId()

    if (!id) {
      return
    }

    const path = pathTo(currentPage().nodes, id) ?? []

    for (const n of path.slice(0, -1)) {
      if (editor.state.collapsed[n.id]) {
        toggleCollapsed(n.id, false)
      }
    }

    queueMicrotask(() =>
      document
        .querySelector(`[data-tree-row="${CSS.escape(id)}"]`)
        ?.scrollIntoView({ block: 'nearest' })
    )
  })

  // Share one draggable across rows; capture selects its node before dnd-kit handles the press.

  const { draggable, ref: dragRef } = useDraggable({
    id: 'tree',
    disabled: true,
  })
  const pickRow = (e: PointerEvent) => {
    const row = (e.target as Element).closest<HTMLElement>('[data-tree-row]')
    const id = row?.dataset.treeRow

    draggable.disabled = !id

    if (id) {
      draggable.data = { kind: 'move', id } satisfies DragData
    }
  }

  return (
    <div
      ref={el => {
        dragRef(el)
        el.addEventListener('pointerdown', pickRow, { capture: true })
      }}
      data-tree-root
      role="tree"
      aria-label="Layers"
      class="scroll-thin min-h-0 flex-1 overflow-y-auto px-1.5 pt-1 pb-24"
    >
      <For each={ids()}>
        {(id, i) => (
          <TreeRow
            tree={tree}
            row={rows().byId.get(id)!}
            index={i()}
            issues={issues().get(id)}
          />
        )}
      </For>

      <Show when={!nodes().length}>
        <p class="px-3 py-6 text-center text-sm text-ink-3">
          No layers yet. Drag a component here or onto the preview.
        </p>
      </Show>
    </div>
  )
}

function InsertGap(props: {
  tree: TreeContext
  row: Row
  index: number
  edge: 'top' | 'bottom'
}) {
  let el!: HTMLButtonElement
  const [x, setX] = createSignal<number | null>(null)
  const key = () => `${props.row.node.id}:${props.edge}`
  const open = () => props.tree.isPickerAt(key())
  const options = () =>
    boundaryOptions(currentPage().nodes, props.tree.rows(), props.index)

  // Skip target calculations for idle insertion gaps.

  const chosen = createMemo(() => {
    const px = x()

    if (px === null && !open()) {
      return null
    }

    const opts = untrack(options)

    if (px !== null) {
      const want = Math.floor((px - 6) / 14)

      return opts.find(o => o.depth <= want) ?? opts.at(-1)
    }

    // The pointer moved on to the open picker: stay where it was opened.
    const at = editor.state.inserting

    return (
      opts.find(o => o.refId === at?.refId && o.zone === at.zone) ?? opts[0]
    )
  })
  const left = () => indent(chosen()?.depth ?? 0) + 2

  return (
    <button
      ref={el}
      type="button"
      tabindex={-1}
      data-insert-zone
      aria-label="Add a component here"
      title="Add a component here"
      class={`absolute inset-x-0 z-10 h-2 cursor-pointer ${
        props.edge === 'top' ? '-top-1' : '-bottom-1'
      }`}
      onPointerMove={e => setX(e.clientX - el.getBoundingClientRect().left)}
      onPointerLeave={() => setX(null)}
      onClick={() => {
        const o = chosen() ?? options()[0]

        if (!o) {
          return
        }

        const r = el.getBoundingClientRect()

        openInsert({
          refId: o.refId,
          zone: o.zone,
          x: r.left + indent(o.depth) + 2,
          y: r.bottom + 4,
          source: 'tree',
          key: key(),
        })
      }}
    >
      {/* Drawn only while in use, so idle gaps stay a single element. */}
      <Show when={chosen()}>
        <span class="pointer-events-none absolute inset-0 animate-fade-in">
          <span
            class="absolute right-1 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-accent"
            style={{ left: `${left()}px` }}
          />

          <span
            class="absolute top-1/2 grid size-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent text-on-accent"
            style={{ left: `${left()}px` }}
          >
            <Icon
              name="plus"
              size={10}
            />
          </span>
        </span>
      </Show>
    </button>
  )
}

// Overlay actions to avoid row reflow; omit tab stops because duplicate/delete have shortcuts.
function RowActions(props: { id: string; name: string; selected: boolean }) {
  return (
    <div
      class={`absolute inset-y-0 right-1 flex items-center gap-0.5 ${
        props.selected ? 'bg-accent-soft' : 'bg-hover'
      }`}
    >
      <span
        class={`pointer-events-none absolute inset-y-0 right-full w-6 bg-linear-to-r from-transparent ${
          props.selected ? 'to-accent-soft' : 'to-hover'
        }`}
      />

      <IconButton
        icon="copy"
        size="sm"
        tabindex={-1}
        label={`Duplicate ${props.name} (${modKey()} D)`}
        onClick={() => duplicate(props.id)}
      />

      <IconButton
        icon="trash"
        size="sm"
        tone="danger"
        tabindex={-1}
        label={`Delete ${props.name} (⌫)`}
        onClick={() => {
          hover(null)
          remove(props.id)
        }}
      />
    </div>
  )
}

function TreeRow(props: {
  tree: TreeContext
  row: Row
  index: number
  issues?: Array<Issue>
}) {
  // Memoize per-row values because keyed rows survive edits.

  const row = createMemo(() => props.row)
  const issues = createMemo(() => props.issues, undefined, {
    equals: sameIssues,
  })
  const id = row().node.id
  const node = () => row().node
  const [pointerIn, setPointerIn] = createSignal(false)
  const selected = () => props.tree.isSelected(id)
  const mark = createMemo(() => props.tree.dropAt(id))
  const ring = () => (mark()?.zone === 'inside' ? mark() : null)
  const line = () => {
    const m = mark()

    return m && m.zone !== 'inside' ? m : null
  }
  const level = () =>
    issues()?.some(i => i.level === 'error')
      ? 'error'
      : issues()?.length
        ? 'warning'
        : null
  const slot = () => slotOf(node())

  return (
    <div
      data-tree-row={id}
      role="treeitem"
      aria-level={row().depth + 1}
      aria-selected={selected()}
      aria-expanded={row().expandable ? row().expanded : undefined}
      class={`relative flex h-7 cursor-default items-center gap-1.5 rounded-md pr-2 select-none ${
        selected()
          ? 'bg-accent-soft text-ink'
          : props.tree.isHovered(id)
            ? 'bg-hover'
            : ''
      } ${ring() ? `ring-2 ring-inset ${ring()!.bad ? 'ring-danger' : 'ring-accent'}` : ''}`}
      style={{ 'padding-left': `${indent(row().depth)}px` }}
      onPointerDown={e => {
        if (e.button !== 0 || (e.target as HTMLElement).closest('button')) {
          return
        }

        select(id)
      }}
      onPointerEnter={() => {
        setPointerIn(true)

        if (!editor.state.drag) {
          hover(id)
        }
      }}
      onPointerLeave={() => {
        setPointerIn(false)
        hover(null)
      }}
    >
      <Show when={props.index === 0}>
        <InsertGap
          tree={props.tree}
          row={row()}
          index={-1}
          edge="top"
        />
      </Show>

      <InsertGap
        tree={props.tree}
        row={row()}
        index={props.index}
        edge="bottom"
      />

      <Show when={line()}>
        {m => (
          <div
            class={`pointer-events-none absolute right-1 h-0.5 rounded-full ${
              m().bad ? 'bg-danger' : 'bg-accent'
            } ${m().zone === 'before' ? '-top-px' : '-bottom-px'}`}
            style={{ left: `${indent(row().depth)}px` }}
          />
        )}
      </Show>

      <Show
        when={row().expandable}
        fallback={<span class="w-4 shrink-0" />}
      >
        <button
          type="button"
          tabindex={-1}
          aria-label={row().expanded ? 'Collapse' : 'Expand'}
          class="grid size-4 shrink-0 place-items-center rounded text-ink-3 hover:text-ink"
          onClick={() => toggleCollapsed(id)}
        >
          <Icon
            name={row().expanded ? 'chevronDown' : 'chevronRight'}
            size={14}
          />
        </button>
      </Show>

      <Icon
        name={iconFor(node().tag)}
        size={14}
        class={selected() ? 'text-accent' : 'text-ink-3'}
      />

      <span
        class={`shrink-0 ${isText(node()) ? 'text-ink-2 italic' : 'font-medium'}`}
      >
        {displayName(node().tag)}
      </span>

      <span class="min-w-0 flex-1 truncate text-sm text-ink-3">
        {hint(node())}
      </span>

      <Show when={slot()}>
        <span
          class="max-w-24 shrink truncate rounded bg-hover px-1.5 font-mono text-[10px] leading-[18px] text-ink-2"
          title={`In the “${slot()}” slot`}
        >
          {slot()}
        </span>
      </Show>

      <Show when={pointerIn()}>
        <RowActions
          id={id}
          name={displayName(node().tag)}
          selected={selected()}
        />
      </Show>

      <Show when={level()}>
        {lvl => (
          <span
            title={issues()
              ?.map(i => i.message)
              .join('\n')}
            class={lvl() === 'error' ? 'text-danger' : 'text-warn'}
          >
            <Icon
              name={lvl() === 'error' ? 'error' : 'warning'}
              size={14}
            />
          </span>
        )}
      </Show>
    </div>
  )
}
