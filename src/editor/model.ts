import type { Catalog } from '../polaris/catalog.ts'

export type Version = 'v1' | 'v2'

// Boolean attributes use true for presence; false is represented by omission.
export type Attrs = Record<string, string | true>

export type ElementNode = {
  id: string
  tag: string
  attrs: Attrs
  children: Array<TreeNode>
}

export type TextNode = { id: string; tag: '#text'; text: string }

export type TreeNode = ElementNode | TextNode

export type Page = { id: string; name: string; nodes: Array<TreeNode> }

export type Doc = { version: Version; pages: Array<Page> }

export const uid = () => crypto.randomUUID()

export const isText = (n: TreeNode): n is TextNode => n.tag === '#text'

export const slotOf = (n: TreeNode) =>
  isText(n) ? '' : ((n.attrs.slot as string | undefined) ?? '')

export type Located = {
  node: TreeNode
  parent: ElementNode | null
  index: number
}

export function locate(
  nodes: Array<TreeNode>,
  id: string,
  parent: ElementNode | null = null
): Located | null {
  for (const [i, n] of nodes.entries()) {
    if (n.id === id) {
      return { node: n, parent, index: i }
    }

    if (!isText(n)) {
      const hit = locate(n.children, id, n)

      if (hit) {
        return hit
      }
    }
  }

  return null
}

export function pathTo(
  nodes: Array<TreeNode>,
  id: string
): Array<TreeNode> | null {
  for (const n of nodes) {
    if (n.id === id) {
      return [n]
    }

    if (!isText(n)) {
      const rest = pathTo(n.children, id)

      if (rest) {
        return [n, ...rest]
      }
    }
  }

  return null
}

export function walk(
  nodes: Array<TreeNode>,
  fn: (n: TreeNode, parent: ElementNode | null) => void,
  parent: ElementNode | null = null
) {
  for (const n of nodes) {
    fn(n, parent)

    if (!isText(n)) {
      walk(n.children, fn, n)
    }
  }
}

export function contains(node: TreeNode, id: string): boolean {
  return (
    !isText(node) && node.children.some(c => c.id === id || contains(c, id))
  )
}

export function textOf(n: TreeNode): string {
  return isText(n) ? n.text : n.children.map(textOf).join('')
}

// Preserve unchanged subtree identities so the renderer can skip them.

function editChildren(
  nodes: Array<TreeNode>,
  parentId: string | null,
  fn: (children: Array<TreeNode>) => Array<TreeNode>
): Array<TreeNode> {
  if (parentId === null) {
    return fn(nodes)
  }

  return updateNode(nodes, parentId, n =>
    isText(n) ? n : { ...n, children: fn(n.children) }
  )
}

export function updateNode(
  nodes: Array<TreeNode>,
  id: string,
  fn: (n: TreeNode) => TreeNode
): Array<TreeNode> {
  const next = nodes.map(n => {
    if (n.id === id) {
      return fn(n)
    }

    if (isText(n)) {
      return n
    }

    const children = updateNode(n.children, id, fn)

    return children === n.children ? n : { ...n, children }
  })

  return next.some((n, i) => n !== nodes[i]) ? next : nodes
}

export function removeNode(nodes: Array<TreeNode>, id: string) {
  const loc = locate(nodes, id)

  if (!loc) {
    return nodes
  }

  return editChildren(nodes, loc.parent?.id ?? null, c =>
    c.filter(x => x.id !== id)
  )
}

export function insertNodes(
  nodes: Array<TreeNode>,
  parentId: string | null,
  index: number,
  items: Array<TreeNode>
) {
  return editChildren(nodes, parentId, c => [
    ...c.slice(0, index),
    ...items,
    ...c.slice(index),
  ])
}

/** `index` is measured before the node is taken out, like a drop indicator. */
export function moveNode(
  nodes: Array<TreeNode>,
  id: string,
  parentId: string | null,
  index: number
) {
  const loc = locate(nodes, id)

  if (!loc || parentId === id || (parentId && contains(loc.node, parentId))) {
    return nodes
  }

  const sameParent = (loc.parent?.id ?? null) === parentId
  const at = sameParent && loc.index < index ? index - 1 : index

  return insertNodes(removeNode(nodes, id), parentId, at, [loc.node])
}

export function withSlot<T extends TreeNode>(n: T, slot: string): T {
  if (isText(n) || slotOf(n) === slot) {
    return n
  }

  const { slot: _old, ...attrs } = n.attrs

  return { ...n, attrs: slot ? { slot, ...attrs } : attrs }
}

export function cloneNode(n: TreeNode): TreeNode {
  return isText(n)
    ? { ...n, id: uid() }
    : {
        ...n,
        id: uid(),
        attrs: { ...n.attrs },
        children: n.children.map(cloneNode),
      }
}

// Rename duplicate ids and their commandFor/interestFor references so copied controls still work.
export function cloneFresh(
  nodes: Array<TreeNode>,
  taken: Set<string>
): Array<TreeNode> {
  const copies = nodes.map(cloneNode)
  const renames = new Map<string, string>()

  walk(copies, n => {
    const id = !isText(n) && n.attrs.id

    if (typeof id === 'string' && taken.has(id)) {
      renames.set(
        id,
        `${id.replace(/-(?:[a-z0-9]{6}|[a-f0-9]{12})$/, '')}-${uid().replaceAll('-', '').slice(0, 12)}`
      )
    }
  })

  walk(copies, n => {
    if (isText(n)) {
      return
    }

    for (const key of ['id', 'commandFor', 'interestFor']) {
      const v = n.attrs[key]

      if (typeof v === 'string' && renames.has(v)) {
        n.attrs[key] = renames.get(v)!
      }
    }
  })

  return copies
}

export function attrIds(nodes: Array<TreeNode>) {
  const ids = new Set<string>()

  walk(
    nodes,
    n => !isText(n) && typeof n.attrs.id === 'string' && ids.add(n.attrs.id)
  )

  return ids
}

export const textOnly = (n: TreeNode) =>
  !isText(n) && n.children.length > 0 && n.children.every(isText)

export type Row = {
  node: TreeNode
  depth: number
  expandable: boolean
  expanded: boolean
}

export function visibleRows(
  nodes: Array<TreeNode>,
  collapsed: Record<string, true>,
  depth = 0,
  out: Array<Row> = []
): Array<Row> {
  for (const n of nodes) {
    const expandable = !isText(n) && n.children.length > 0 && !textOnly(n)
    const expanded = expandable && !collapsed[n.id]

    out.push({ node: n, depth, expandable, expanded })

    if (expanded) {
      visibleRows(n.children, collapsed, depth + 1, out)
    }
  }

  return out
}

export type Boundary = {
  refId: string
  zone: 'before' | 'after'
  depth: number
}

// A gap below a nested group can target several ancestors; try the deepest first.
export function boundaryOptions(
  nodes: Array<TreeNode>,
  rows: Array<Row>,
  i: number
): Array<Boundary> {
  const first = rows[0]

  if (i < 0) {
    return first ? [{ refId: first.node.id, zone: 'before', depth: 0 }] : []
  }

  const row = rows[i]

  if (!row) {
    return []
  }

  const firstChild =
    row.expanded && !isText(row.node) ? row.node.children[0] : undefined

  if (firstChild) {
    return [{ refId: firstChild.id, zone: 'before', depth: row.depth + 1 }]
  }

  const path = pathTo(nodes, row.node.id) ?? []
  const nextDepth = rows[i + 1]?.depth ?? 0
  const out: Array<Boundary> = []

  for (let depth = path.length - 1; depth >= nextDepth; depth--) {
    const n = path[depth]!

    out.push({ refId: n.id, zone: 'after', depth })

    const parent = path[depth - 1] as ElementNode | undefined
    const siblings = parent ? parent.children : nodes

    if (siblings.at(-1) !== n) {
      break
    }
  }

  return out
}

export function countNodes(nodes: Array<TreeNode>) {
  let count = 0

  walk(nodes, n => !isText(n) && count++)

  return count
}

const BLOCKED = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'template',
  'link',
  'meta',
])

export function isSafeAttr(name: string, value: string | true) {
  if (/^on/i.test(name)) {
    return false
  }

  return !(
    typeof value === 'string' && /^\s*(javascript|vbscript):/i.test(value)
  )
}

// ponytail: regex JSX→HTML shim covers literal props; real expressions need a JSX parser
export const jsxToHtml = (src: string) =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/=\{\s*(["'`])([\s\S]*?)\1\s*\}/g, '="$2"')
    .replace(/=\{([^{}]*)\}/g, '="$1"')
    .replace(/<(s-[\w-]+)((?:[^>"']|"[^"]*"|'[^']*')*?)\s*\/>/g, '<$1$2></$1>')

export function parseHTML(html: string, catalog: Catalog) {
  const tpl = document.createElement('template')

  tpl.innerHTML = jsxToHtml(html)

  const skipped = new Set<string>()

  const convert = (list: NodeListOf<ChildNode>): Array<TreeNode> => {
    const out: Array<TreeNode> = []

    for (const c of list) {
      if (c.nodeType === Node.TEXT_NODE) {
        const text = (c as Text).data.replace(/\s+/g, ' ')

        if (text.trim()) {
          out.push({ id: uid(), tag: '#text', text })
        }

        continue
      }

      if (c.nodeType !== Node.ELEMENT_NODE) {
        continue
      }

      const el = c as Element
      const spec = catalog.components[el.localName]

      if (!spec) {
        skipped.add(`<${el.localName}>`)

        if (!BLOCKED.has(el.localName)) {
          out.push(...convert(el.childNodes))
        }

        continue
      }

      const attrs: Attrs = {}

      for (const a of el.attributes) {
        const prop = spec.props.find(p => p.name.toLowerCase() === a.name)
        const name = prop?.name ?? a.name

        if (!isSafeAttr(name, a.value)) {
          skipped.add(`${a.name} on <${el.localName}>`)

          continue
        }

        if (prop?.kind === 'boolean') {
          if (a.value !== 'false') {
            attrs[name] = true
          }
        } else {
          attrs[name] = a.value
        }
      }

      out.push({
        id: uid(),
        tag: el.localName,
        attrs,
        children: convert(el.childNodes),
      })
    }

    const trim = (i: number, fn: (s: string) => string) => {
      const n = out[i]

      if (n && isText(n)) {
        out[i] = { ...n, text: fn(n.text) }
      }
    }

    trim(0, s => s.trimStart())
    trim(out.length - 1, s => s.trimEnd())

    return out
  }

  return { nodes: convert(tpl.content.childNodes), skipped: [...skipped] }
}
