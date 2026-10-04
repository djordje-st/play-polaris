import * as Y from 'yjs'
import { isSafeAttr, isText } from './model'
import type { Attrs, Doc, TreeNode } from './model'

type RecordValue = Y.Map<unknown>

type Placement = { parent: string | null; order: number }

type FlatNode = { tag: string; name?: string; text?: string; attrs?: Attrs }

function flatten(doc: Doc) {
  const nodes = new Map<string, FlatNode>()
  const children = new Map<string | null, string[]>()
  const visit = (id: string, node: FlatNode, parent: string | null) => {
    nodes.set(id, node)

    const siblings = children.get(parent) ?? []

    siblings.push(id)
    children.set(parent, siblings)
  }
  const walk = (items: TreeNode[], parent: string) => {
    for (const node of items) {
      visit(node.id, node, parent)

      if (!isText(node)) {
        walk(node.children, node.id)
      }
    }
  }

  for (const page of doc.pages) {
    visit(page.id, { tag: '#page', name: page.name }, null)
    walk(page.nodes, page.id)
  }

  return { nodes, children }
}

function placement(record?: RecordValue): Placement | undefined {
  const p = record?.get('placement') as Partial<Placement> | undefined

  return p &&
    (p.parent === null || typeof p.parent === 'string') &&
    typeof p.order === 'number' &&
    Number.isFinite(p.order)
    ? (p as Placement)
    : undefined
}

// Change only the edited span, so simultaneous typing can merge character by character.
function editText(text: Y.Text, next: string) {
  const prev = text.toString()
  let start = 0
  let end = 0

  while (
    start < prev.length &&
    start < next.length &&
    prev[start] === next[start]
  ) {
    start++
  }

  if (start && /[\uD800-\uDBFF]/.test(prev[start - 1]!)) {
    start--
  }

  while (
    end < prev.length - start &&
    end < next.length - start &&
    prev[prev.length - end - 1] === next[next.length - end - 1]
  ) {
    end++
  }

  if (end && /[\uDC00-\uDFFF]/.test(prev[prev.length - end]!)) {
    end--
  }

  text.delete(start, prev.length - start - end)
  text.insert(start, next.slice(start, next.length - end))
}

export class SharedDocument {
  readonly doc = new Y.Doc()
  readonly records = this.doc.getMap<RecordValue>('nodes')
  readonly settings = this.doc.getMap<string>('settings')
  readonly history = new Y.UndoManager(this.records, {
    trackedOrigins: new Set([this]),
    captureTimeout: 1500,
  })
  private lastKey?: string

  write(before: Doc, after: Doc, key?: string) {
    if (!key || key !== this.lastKey) {
      this.history.stopCapturing()
    }

    this.lastKey = key

    const prev = flatten(before)
    const next = flatten(after)

    this.doc.transact(() => {
      if (this.settings.get('version') !== after.version) {
        this.settings.set('version', after.version)
      }

      for (const id of prev.nodes.keys()) {
        if (!next.nodes.has(id)) {
          this.records.delete(id)
        }
      }

      for (const [id, node] of next.nodes) {
        let record = this.records.get(id)
        const old = record ? prev.nodes.get(id) : undefined

        if (!record) {
          record = new Y.Map()
          this.records.set(id, record)
          record.set('tag', node.tag)

          if (node.tag === '#text') {
            record.set('text', new Y.Text())
          }
        }

        if (node.name !== old?.name) {
          record.set('name', node.name)
        }

        if (node.text !== old?.text) {
          editText(record.get('text') as Y.Text, node.text ?? '')
        }

        for (const name of new Set([
          ...Object.keys(old?.attrs ?? {}),
          ...Object.keys(node.attrs ?? {}),
        ])) {
          if (old?.attrs?.[name] === node.attrs?.[name]) {
            continue
          }

          const value = node.attrs?.[name]

          if (value === undefined) {
            record.delete(`attr:${name}`)
          } else {
            record.set(`attr:${name}`, value)
          }
        }
      }

      for (const [parent, ids] of next.children) {
        const previous = prev.children.get(parent)

        if (
          previous?.length === ids.length &&
          ids.every(
            (id, i) =>
              id === previous[i] &&
              placement(this.records.get(id))?.parent === parent
          )
        ) {
          continue
        }

        let left = -Infinity
        const orders = ids.map((id, index) => {
          const current = placement(this.records.get(id))
          const right =
            ids
              .slice(index + 1)
              .map(nextId => placement(this.records.get(nextId)))
              .find(p => p?.parent === parent && p.order > left)?.order ??
            Infinity
          const order =
            current?.parent === parent &&
            current.order > left &&
            current.order < right
              ? current.order
              : !Number.isFinite(left)
                ? Number.isFinite(right)
                  ? right - 1
                  : 0
                : !Number.isFinite(right)
                  ? left + 1
                  : left + (right - left) / 2

          left = order

          return order
        })
        // ponytail: O(n²) sibling scans and numeric ranks suit small pages;
        // use indexed string ranks if large, frequently reordered pages need them.
        const rebalance = orders.some(
          (n, i) => !Number.isFinite(n) || (i > 0 && n <= orders[i - 1]!)
        )

        ids.forEach((id, i) => {
          const record = this.records.get(id)!
          const old = placement(record)
          const order = rebalance ? i : orders[i]!

          if (old?.parent !== parent || old.order !== order) {
            record.set('placement', { parent, order })
          }
        })
      }
    }, this)
  }

  read(): Doc | null {
    const version = this.settings.get('version')

    if (version !== 'v1' && version !== 'v2') {
      return null
    }

    const entries = [...this.records]
      .filter(
        ([id, record]) =>
          /^[\w-]{1,80}$/.test(id) &&
          record instanceof Y.Map &&
          placement(record)
      )
      .sort(
        ([a, ar], [b, br]) =>
          placement(ar)!.order - placement(br)!.order ||
          (a < b ? -1 : a > b ? 1 : 0)
      )
    const pages = entries
      .filter(([, r]) => r.get('tag') === '#page')
      .map(([id, r]) => ({
        id,
        name:
          typeof r.get('name') === 'string'
            ? (r.get('name') as string)
            : 'Untitled',
        nodes: [] as TreeNode[],
      }))

    // Concurrent deletion of different last pages still leaves everyone a usable canvas.
    if (!pages.length) {
      pages.push({ id: 'empty', name: 'Home', nodes: [] })
    }

    const children = new Map<string, Array<[string, RecordValue]>>()

    for (const entry of entries) {
      if (entry[1].get('tag') === '#page') {
        continue
      }

      const parent = placement(entry[1])!.parent ?? pages[0]!.id
      const siblings = children.get(parent) ?? []

      siblings.push(entry)
      children.set(parent, siblings)
    }

    const seen = new Set<string>()
    const build = (
      [id, record]: [string, RecordValue],
      depth = 0
    ): TreeNode[] => {
      if (seen.has(id) || depth > 100) {
        return []
      }

      seen.add(id)

      const tag = record.get('tag')

      if (tag === '#text') {
        const text = record.get('text')

        return text instanceof Y.Text
          ? [{ id, tag, text: text.toString() }]
          : []
      }

      // Treat peer content like imported HTML: no scripts, event attributes or unsafe URLs.
      if (typeof tag !== 'string' || !/^s-[a-z0-9-]+$/.test(tag)) {
        return []
      }

      const attrs: Attrs = Object.fromEntries(
        [...record].flatMap(([key, value]) => {
          const name = key.slice(5)

          return key.startsWith('attr:') &&
            /^[\w-]+$/.test(name) &&
            (typeof value === 'string' || value === true) &&
            isSafeAttr(name, value)
            ? [[name, value]]
            : []
        })
      )

      return [
        {
          id,
          tag,
          attrs,
          children: (children.get(id) ?? []).flatMap(child =>
            build(child, depth + 1)
          ),
        },
      ]
    }

    for (const page of pages) {
      page.nodes = (children.get(page.id) ?? []).flatMap(entry => build(entry))
    }

    // Broken parent links and cycles from concurrent moves recover at the first page's root.
    for (const entry of entries) {
      if (entry[1].get('tag') !== '#page') {
        pages[0]!.nodes.push(...build(entry))
      }
    }

    return { version, pages }
  }
}
