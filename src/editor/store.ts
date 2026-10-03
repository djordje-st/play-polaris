import { batch } from 'solid-js'
import { createStore } from '@tanstack/solid-store'
import manifestV1Url from 'polaris-types-v1/custom-elements?url'
import manifestV2Url from 'polaris-types-v2/custom-elements?url'
import { buildCatalog } from '../polaris/catalog'
import { TEMPLATES, presetFor } from '../polaris/library'
import { placementError } from '../polaris/rules'
import {
  attrIds,
  cloneFresh,
  insertNodes,
  isText,
  locate,
  moveNode,
  parseHTML,
  pathTo,
  removeNode,
  slotOf,
  uid,
  updateNode,
  withSlot,
} from './model'
import type { Catalog, Manifest } from '../polaris/catalog'
import type { Doc, ElementNode, Page, TreeNode, Version } from './model'

export type Viewport = 'desktop' | 'tablet' | 'mobile'

export type Mode = 'design' | 'interact'

export type Target = { parentId: string | null; index: number; slot: string }

export type DropTarget = Target & {
  zone: 'before' | 'after' | 'inside'
  refId: string | null
  error: string | null
}

export type Inserting = {
  refId: string | null
  zone: 'before' | 'after' | 'inside'
  x: number
  y: number
  source: 'tree' | 'canvas'

  key?: string
}

export type DragState = {
  label: string
  x: number
  y: number
  target: DropTarget | null
}

export type AgentEvent = {
  id: number
  tool: string
  detail: string
  ok: boolean
  at: number
}

export type Toast = {
  id: number
  message: string
  tone: 'neutral' | 'critical'
  action?: { label: string; run: () => void }
}

export type Preset = {
  id: string
  name: string
  description: string
  nodes: Array<TreeNode>
  createdAt: number
}

export type State = {
  ready: boolean
  catalog: Catalog | null
  doc: Doc
  pageId: string
  selectedId: string | null
  hoveredId: string | null
  mode: Mode
  viewport: Viewport
  collapsed: Record<string, true>
  past: Array<Doc>
  future: Array<Doc>
  lastKey: string | null
  lastAt: number
  drag: DragState | null
  agentLog: Array<AgentEvent>
  saveState: 'saved' | 'saving' | 'error'
  toast: Toast | null
  inserting: Inserting | null
  presets: Array<Preset>
  access: 'editing' | 'viewing'
}

export const editor = createStore<State>({
  ready: false,
  catalog: null,
  doc: { version: 'v1', pages: [] },
  pageId: '',
  selectedId: null,
  hoveredId: null,
  mode: 'design',
  viewport: 'desktop',
  collapsed: {},
  past: [],
  future: [],
  lastKey: null,
  lastAt: 0,
  drag: null,
  agentLog: [],
  saveState: 'saved',
  toast: null,
  inserting: null,
  presets: [],
  access: 'editing',
})

// The store is a singleton; hot-swapping it would orphan mounted components.
import.meta.hot?.accept(() => location.reload())

const S = () => editor.state

// Batch selector updates so memos never observe a mix of old and new state.
const update = (recipe: (s: State) => State) =>
  batch(() => editor.setState(recipe))
const patch = (p: Partial<State>) => update(s => ({ ...s, ...p }))

// A workspace always has at least one page: deletePage refuses the last one.
export const currentPage = (s: State = S()): Page =>
  s.doc.pages.find(p => p.id === s.pageId) ?? s.doc.pages[0]!

export const catalog = () => {
  const c = S().catalog

  if (!c) {
    throw new Error('Component catalog not loaded')
  }

  return c
}

const MANIFEST_URL: Record<Version, string> = {
  v1: manifestV1Url,
  v2: manifestV2Url,
}

const catalogs: Partial<Record<Version, Catalog>> = {}

export async function loadCatalog(version: Version) {
  if (catalogs[version]) {
    return catalogs[version]
  }

  const res = await fetch(MANIFEST_URL[version])

  if (!res.ok) {
    throw new Error(
      `Couldn't load the ${version} component manifest (${res.status})`
    )
  }

  return (catalogs[version] = buildCatalog(
    version,
    (await res.json()) as Manifest
  ))
}

export type Snapshot = {
  version: Version
  pages: Array<Page>
  pageId: string
  viewport: Viewport
  presets: Array<Preset>
}

export const snapshotOf = (s: State = S()): Snapshot => ({
  version: s.doc.version,
  pages: s.doc.pages,
  pageId: s.pageId,
  viewport: s.viewport,
  presets: s.presets,
})

export function initWorkspace(saved: Snapshot | null, c: Catalog) {
  const pages = saved?.pages.length
    ? saved.pages
    : [{ id: uid(), name: 'Home', nodes: fromTemplate('home', 'Home', c) }]
  const pageId =
    saved && pages.some(p => p.id === saved.pageId)
      ? saved.pageId
      : pages[0]!.id

  patch({
    ready: true,
    doc: { version: saved?.version ?? c.version, pages },
    pageId,
    viewport: saved?.viewport ?? 'desktop',
    presets: saved?.presets ?? [],
  })
}

// Discard undo history because it belongs to the snapshot being replaced.
export function applySnapshot(snap: Snapshot) {
  if (!snap.pages.length) {
    return
  }

  update(s =>
    settle({
      ...s,
      doc: { version: snap.version, pages: snap.pages },
      presets: snap.presets,
      viewport: snap.viewport,

      pageId: snap.pages.some(p => p.id === s.pageId) ? s.pageId : snap.pageId,
      past: [],
      future: [],
      lastKey: null,
      toast: null,
      inserting: null,
      drag: null,
    })
  )
}

export const canEdit = () => S().access === 'editing'

export const setAccess = (access: State['access']) => patch({ access })

export const setSaveState = (saveState: State['saveState']) =>
  S().saveState !== saveState && patch({ saveState })

// Merge consecutive edits with the same key so typing undoes as one action.

type CommitOptions = { key?: string; select?: string | null }

function commit(recipe: (doc: Doc) => Doc, opts: CommitOptions = {}) {
  if (!canEdit()) {
    return
  }

  update(s => {
    const doc = recipe(s.doc)
    const selectedId = opts.select !== undefined ? opts.select : s.selectedId

    if (doc === s.doc) {
      return selectedId === s.selectedId ? s : { ...s, selectedId }
    }

    const now = Date.now()
    const merge = !!opts.key && opts.key === s.lastKey && now - s.lastAt < 1500

    return {
      ...s,
      doc,
      selectedId,
      past: merge ? s.past : [...s.past.slice(-99), s.doc],
      future: [],
      lastKey: opts.key ?? null,
      lastAt: now,
    }
  })
}

const editPage =
  (fn: (nodes: Array<TreeNode>) => Array<TreeNode>, pageId = S().pageId) =>
  (doc: Doc): Doc => {
    const pages = doc.pages.map(p => {
      if (p.id !== pageId) {
        return p
      }

      const nodes = fn(p.nodes)

      return nodes === p.nodes ? p : { ...p, nodes }
    })

    return pages.some((p, i) => p !== doc.pages[i]) ? { ...doc, pages } : doc
  }

function settle(s: State): State {
  const page = currentPage(s)
  const selectedId =
    s.selectedId && locate(page.nodes, s.selectedId) ? s.selectedId : null

  return { ...s, pageId: page.id, selectedId }
}

export function undo() {
  if (!canEdit()) {
    return
  }

  update(s => {
    const prev = s.past.at(-1)

    if (!prev) {
      return s
    }

    return settle({
      ...s,
      doc: { ...prev, version: s.doc.version },
      past: s.past.slice(0, -1),
      future: [s.doc, ...s.future],
      lastKey: null,
    })
  })
}

export function redo() {
  if (!canEdit()) {
    return
  }

  update(s => {
    const next = s.future[0]

    if (!next) {
      return s
    }

    return settle({
      ...s,
      doc: { ...next, version: s.doc.version },
      past: [...s.past, s.doc],
      future: s.future.slice(1),
      lastKey: null,
    })
  })
}

export const select = (id: string | null) =>
  S().selectedId !== id && patch({ selectedId: id })

export const hover = (id: string | null) =>
  S().hoveredId !== id && patch({ hoveredId: id })

export const setMode = (mode: Mode) => patch({ mode, hoveredId: null })

export const setViewport = (viewport: Viewport) => patch({ viewport })

export const setVersion = (version: Version) =>
  canEdit() && update(s => ({ ...s, doc: { ...s.doc, version } }))

export const setCatalog = (c: Catalog) => patch({ catalog: c })

export const setDrag = (drag: DragState | null) => patch({ drag })

export const openInsert = (inserting: Inserting) => patch({ inserting })

export const closeInsert = () => S().inserting && patch({ inserting: null })

export function toggleCollapsed(id: string, force?: boolean) {
  update(s => {
    const collapsed = { ...s.collapsed }

    if (force ?? !collapsed[id]) {
      collapsed[id] = true
    } else {
      delete collapsed[id]
    }

    return { ...s, collapsed }
  })
}

let toastSeq = 0
let toastTimer: ReturnType<typeof setTimeout> | undefined

export function notify(
  message: string,
  tone: Toast['tone'] = 'neutral',
  action?: Toast['action']
) {
  clearTimeout(toastTimer)
  patch({ toast: { id: ++toastSeq, message, tone, action } })
  // Give people time to reach an action button.
  toastTimer = setTimeout(() => patch({ toast: null }), action ? 6000 : 2800)
}

export const dismissToast = () => {
  clearTimeout(toastTimer)
  patch({ toast: null })
}

let agentSeq = 0

export function logAgent(tool: string, detail: string, ok: boolean) {
  update(s => ({
    ...s,
    agentLog: [
      { id: ++agentSeq, tool, detail, ok, at: Date.now() },
      ...s.agentLog,
    ].slice(0, 30),
  }))
}

export const parse = (html: string) => parseHTML(html, catalog())

export function insertionPoint(
  tagOrTags: string | Array<string>
): (Target & { error: null }) | { error: string } {
  const c = catalog()
  const tags = typeof tagOrTags === 'string' ? [tagOrTags] : tagOrTags
  // Every root has to fit: a saved component can be a button and its modal.
  const blocked = (parentTag: string | null, slot: string) =>
    tags.map(t => placementError(c, parentTag, slot, t)).find(Boolean) ?? null
  const nodes = currentPage().nodes
  const id = S().selectedId
  const path = id ? pathTo(nodes, id) : null
  const sel = path?.at(-1)

  if (path && sel) {
    if (!isText(sel) && !blocked(sel.tag, '')) {
      return {
        parentId: sel.id,
        index: sel.children.length,
        slot: '',
        error: null,
      }
    }

    for (const [i, n] of [...path.entries()].reverse()) {
      const parent = (path[i - 1] as ElementNode | undefined) ?? null
      const index = (parent ? parent.children : nodes).indexOf(n) + 1

      for (const slot of new Set([slotOf(n), ''])) {
        if (!blocked(parent?.tag ?? null, slot)) {
          return { parentId: parent?.id ?? null, index, slot, error: null }
        }
      }
    }
  } else {
    const pageEl = nodes.find((n): n is ElementNode => n.tag === 's-page')

    if (pageEl && !blocked('s-page', '')) {
      return {
        parentId: pageEl.id,
        index: pageEl.children.length,
        slot: '',
        error: null,
      }
    }
  }

  const atRoot = blocked(null, '')

  return atRoot
    ? { error: `${atRoot}. Select where it should go first.` }
    : { parentId: null, index: nodes.length, slot: '', error: null }
}

export function insertAt(
  items: Array<TreeNode>,
  at: Target,
  selectId?: string
) {
  const fresh = cloneFresh(items, attrIds(currentPage().nodes))
  const placed = fresh.map(n => withSlot(n, at.slot))
  const focus = selectId
    ? fresh[items.findIndex(n => n.id === selectId)]
    : placed.at(-1)

  commit(
    editPage(nodes => insertNodes(nodes, at.parentId, at.index, placed)),
    {
      select: focus?.id ?? null,
    }
  )

  if (at.parentId) {
    toggleCollapsed(at.parentId, false)
  }

  return placed
}

export function insertComponent(tag: string, at?: Target) {
  const target = at ?? insertionPoint(tag)

  if ('error' in target && target.error) {
    return notify(target.error, 'critical')
  }

  const { nodes } = parse(presetFor(tag))

  insertAt(nodes, target as Target, nodes.find(n => n.tag === tag)?.id)
}

export function move(id: string, at: Target) {
  commit(
    editPage(nodes =>
      updateNode(moveNode(nodes, id, at.parentId, at.index), id, n =>
        withSlot(n, at.slot)
      )
    ),
    { select: id }
  )
}

export function nudge(id: string, delta: -1 | 1) {
  const loc = locate(currentPage().nodes, id)

  if (!loc) {
    return
  }

  const siblings = loc.parent ? loc.parent.children : currentPage().nodes
  const to = loc.index + (delta > 0 ? 2 : -1)

  if (to < 0 || to > siblings.length) {
    return
  }

  move(id, {
    parentId: loc.parent?.id ?? null,
    index: to,
    slot: slotOf(loc.node),
  })
}

export function setAttr(id: string, name: string, value: string | true | null) {
  commit(
    editPage(nodes =>
      updateNode(nodes, id, n => {
        if (isText(n)) {
          return n
        }

        const { [name]: _prev, ...rest } = n.attrs

        return {
          ...n,
          attrs: value === null ? rest : { ...n.attrs, [name]: value },
        }
      })
    ),
    { key: `attr:${id}:${name}` }
  )
}

export function setText(id: string, text: string) {
  commit(
    editPage(nodes =>
      updateNode(nodes, id, n => {
        if (isText(n)) {
          return { ...n, text }
        }

        const only = n.children.length === 1 ? n.children[0] : undefined
        const keep = only && isText(only) ? only.id : uid()

        return {
          ...n,
          children: text ? [{ id: keep, tag: '#text', text }] : [],
        }
      })
    ),
    { key: `text:${id}` }
  )
}

export function remove(id: string) {
  const loc = locate(currentPage().nodes, id)

  if (!loc) {
    return
  }

  const siblings = loc.parent ? loc.parent.children : currentPage().nodes
  const next = siblings[loc.index + 1] ?? siblings[loc.index - 1] ?? loc.parent

  commit(
    editPage(nodes => removeNode(nodes, id)),
    { select: next?.id ?? null }
  )
}

export function duplicate(id: string) {
  const loc = locate(currentPage().nodes, id)

  if (!loc) {
    return
  }

  insertAt([loc.node], {
    parentId: loc.parent?.id ?? null,
    index: loc.index + 1,
    slot: slotOf(loc.node),
  })
}

export function replacePage(nodes: Array<TreeNode>, pageId = S().pageId) {
  commit(
    editPage(() => nodes, pageId),
    { select: null }
  )
}

const escapeAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

export function fromTemplate(
  templateId: string,
  name: string,
  c: Catalog = catalog()
) {
  const tpl = TEMPLATES.find(t => t.id === templateId) ?? TEMPLATES[0]!

  return parseHTML(tpl.html.replaceAll('{name}', escapeAttr(name)), c).nodes
}

export function uniquePageName(base: string) {
  const names = new Set(S().doc.pages.map(p => p.name.toLowerCase()))

  if (!names.has(base.toLowerCase())) {
    return base
  }

  let i = 2

  while (names.has(`${base} ${i}`.toLowerCase())) {
    i++
  }

  return `${base} ${i}`
}

export function addPage(name: string, nodes: Array<TreeNode>) {
  const page: Page = { id: uid(), name, nodes }

  commit(doc => ({ ...doc, pages: [...doc.pages, page] }), { select: null })
  patch({ pageId: page.id })

  return page
}

export const openPage = (pageId: string) =>
  S().pageId !== pageId &&
  patch({ pageId, selectedId: null, hoveredId: null, inserting: null })

export function renamePage(pageId: string, name: string) {
  commit(
    doc => ({
      ...doc,
      pages: doc.pages.map(p => (p.id === pageId ? { ...p, name } : p)),
    }),
    {
      key: `page-name:${pageId}`,
    }
  )
}

export function duplicatePage(pageId: string) {
  const src = S().doc.pages.find(p => p.id === pageId)

  if (!src) {
    return
  }

  const page: Page = {
    id: uid(),
    name: uniquePageName(`${src.name} copy`),
    nodes: cloneFresh(src.nodes, new Set()),
  }

  commit(doc => {
    const pages = [...doc.pages]

    pages.splice(pages.indexOf(src) + 1, 0, page)

    return { ...doc, pages }
  })
  patch({ pageId: page.id, selectedId: null })
}

export function deletePage(pageId: string) {
  const pages = S().doc.pages

  if (pages.length < 2) {
    return notify('A workspace needs at least one page', 'critical')
  }

  const i = pages.findIndex(p => p.id === pageId)
  const fallback = pages[i + 1] ?? pages[i - 1]

  commit(doc => ({ ...doc, pages: doc.pages.filter(p => p.id !== pageId) }))

  if (fallback && S().pageId === pageId) {
    patch({ pageId: fallback.id, selectedId: null })
  }
}

export const presetTags = (p: Preset) =>
  p.nodes.filter(n => !isText(n)).map(n => n.tag)

export const findPreset = (id: string) => S().presets.find(p => p.id === id)

export function uniquePresetName(base: string) {
  const names = new Set(S().presets.map(p => p.name.toLowerCase()))

  if (!names.has(base.toLowerCase())) {
    return base
  }

  let i = 2

  while (names.has(`${base} ${i}`.toLowerCase())) {
    i++
  }

  return `${base} ${i}`
}

/** Placement is decided where the copy lands, so a root's slot isn't kept. */
const snapshot = (nodes: Array<TreeNode>) =>
  cloneFresh(nodes, new Set()).map(n => withSlot(n, ''))

export function savePreset(input: {
  name: string
  description: string
  nodes: Array<TreeNode>
}) {
  if (!canEdit()) {
    return null
  }

  const preset: Preset = {
    id: uid(),
    name: input.name,
    description: input.description,
    nodes: snapshot(input.nodes),
    createdAt: Date.now(),
  }

  patch({ presets: [...S().presets, preset] })

  return preset
}

export function updatePreset(
  id: string,
  changes: Partial<Pick<Preset, 'name' | 'description' | 'nodes'>>
) {
  if (!canEdit()) {
    return
  }

  const next = changes.nodes
    ? { ...changes, nodes: snapshot(changes.nodes) }
    : changes

  patch({
    presets: S().presets.map(p => (p.id === id ? { ...p, ...next } : p)),
  })
}

export function deletePreset(id: string) {
  if (!canEdit()) {
    return
  }

  const presets = S().presets
  const index = presets.findIndex(p => p.id === id)
  const preset = presets[index]

  if (!preset) {
    return
  }

  patch({ presets: presets.filter(p => p.id !== id) })
  notify(`Deleted “${preset.name}”`, 'neutral', {
    label: 'Undo',
    run: () => {
      const now = [...S().presets]

      now.splice(Math.min(index, now.length), 0, preset)
      patch({ presets: now })
    },
  })
}

export function insertPreset(id: string, at?: Target) {
  const preset = findPreset(id)

  if (!preset) {
    return
  }

  const target = at ?? insertionPoint(presetTags(preset))

  if ('error' in target && target.error) {
    return notify(target.error, 'critical')
  }

  insertAt(
    preset.nodes,
    target as Target,
    preset.nodes.find(n => !isText(n))?.id
  )
}
