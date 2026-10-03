import { toHTML } from './codegen'
import { isText, locate, visibleRows } from './model'
import {
  catalog,
  currentPage,
  duplicate,
  editor,
  insertAt,
  insertionPoint,
  notify,
  nudge,
  parse,
  redo,
  remove,
  select,
  toggleCollapsed,
  undo,
} from './store'

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))

export const modKey = () =>
  /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'

export const shortcutList = (): Array<[keys: string, action: string]> => {
  const m = modKey()

  return [
    [`${m} Z`, 'Undo'],
    [`⇧ ${m} Z`, 'Redo'],
    [`${m} C · X · V`, 'Copy, cut, paste as HTML'],
    [`${m} D`, 'Duplicate'],
    ['⌫', 'Delete'],
    ['↑ ↓', 'Previous or next layer'],
    ['← →', 'Collapse or expand'],
    ['⌥ ↑ ↓', 'Move among siblings'],
    ['Esc', 'Select parent'],
    [`${m} K`, 'Find a component'],
  ]
}

export function handleShortcut(e: KeyboardEvent) {
  if (
    e.defaultPrevented ||
    document.body.classList.contains('driver-active') ||
    document.querySelector('dialog[open], [popover]:popover-open')
  ) {
    return
  }

  const mod = e.metaKey || e.ctrlKey
  const key = e.key.toLowerCase()
  const typing = isTyping(e.target)

  const run = (fn: () => void) => {
    e.preventDefault()
    fn()
  }

  if (mod && key === 'z' && !typing) {
    return run(e.shiftKey ? redo : undo)
  }

  if (mod && key === 'y' && !typing) {
    return run(redo)
  }

  if (mod && key === 'k') {
    return run(() => dispatchEvent(new Event('playground:find-component')))
  }

  if (typing) {
    return
  }

  const s = editor.state
  const id = s.selectedId
  const nodes = currentPage(s).nodes
  const loc = id ? locate(nodes, id) : null
  const rows = visibleRows(nodes, s.collapsed)
  const at = rows.findIndex(r => r.node.id === id)

  if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    return id && run(() => nudge(id, e.key === 'ArrowUp' ? -1 : 1))
  }

  switch (e.key) {
    case 'ArrowUp':
    case 'ArrowDown': {
      const next = rows[at < 0 ? 0 : at + (e.key === 'ArrowUp' ? -1 : 1)]

      return next && run(() => select(next.node.id))
    }

    case 'ArrowLeft':
      if (!loc) {
        return
      }

      return run(() =>
        rows[at]?.expanded
          ? toggleCollapsed(loc.node.id, true)
          : select(loc.parent?.id ?? loc.node.id)
      )

    case 'ArrowRight': {
      const row = rows[at]
      const child = rows[at + 1]

      if (!row?.expandable) {
        return
      }

      return run(() =>
        row.expanded && child
          ? select(child.node.id)
          : toggleCollapsed(row.node.id, false)
      )
    }

    case 'Escape':
      return loc && run(() => select(loc.parent?.id ?? null))

    case 'Delete':
    case 'Backspace':
      return id && run(() => remove(id))
  }

  if (mod && key === 'd' && id) {
    return run(() => duplicate(id))
  }
}

export function installClipboard() {
  const skip = () =>
    isTyping(document.activeElement) ||
    !!getSelection()?.toString() ||
    !!document.querySelector('dialog[open]')

  const copy = (e: ClipboardEvent, cut: boolean) => {
    const id = editor.state.selectedId
    const node = id ? locate(currentPage().nodes, id)?.node : null

    if (skip() || !id || !node) {
      return
    }

    e.preventDefault()
    e.clipboardData?.setData('text/plain', toHTML([node], catalog()))

    if (cut) {
      remove(id)
    }

    notify(cut ? 'Cut as HTML' : 'Copied as HTML')
  }

  const onCopy = (e: ClipboardEvent) => copy(e, false)
  const onCut = (e: ClipboardEvent) => copy(e, true)

  const onPaste = (e: ClipboardEvent) => {
    const text = e.clipboardData?.getData('text/plain') ?? ''

    if (skip() || !/<s-[a-z]/.test(text)) {
      return
    }

    e.preventDefault()

    const { nodes, skipped } = parse(text)
    const first = nodes.find(n => !isText(n))

    if (!first) {
      return
    }

    const target = insertionPoint(first.tag)

    if (target.error !== null) {
      return notify(target.error, 'critical')
    }

    insertAt(nodes, target)
    notify(skipped.length ? `Pasted. Skipped ${skipped.join(', ')}` : 'Pasted')
  }

  document.addEventListener('copy', onCopy)
  document.addEventListener('cut', onCut)
  document.addEventListener('paste', onPaste)

  return () => {
    document.removeEventListener('copy', onCopy)
    document.removeEventListener('cut', onCut)
    document.removeEventListener('paste', onPaste)
  }
}
