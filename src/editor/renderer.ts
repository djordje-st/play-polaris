import { displayName } from '../polaris/catalog'
import { isContainer } from '../polaris/rules'
import { isSafeAttr, isText, slotOf } from './model'
import type { Catalog } from '../polaris/catalog'
import type { Attrs, ElementNode, TreeNode } from './model'

// Reuse DOM nodes and skip unchanged subtrees to preserve component state.

export type Renderer = ReturnType<typeof createRenderer>

export function createRenderer(doc: Document) {
  const byId = new Map<string, ChildNode>()
  const idOf = new WeakMap<Node, string>()
  const rendered = new WeakMap<Node, TreeNode>()
  const placeholders = new WeakMap<Element, HTMLElement>()
  const placeholderOwner = new WeakMap<Element, string>()
  let catalog: Catalog

  function syncAttrs(el: Element, prev: Attrs, next: Attrs) {
    for (const k in prev) {
      if (!(k in next)) {
        el.removeAttribute(k)
      }
    }

    for (const [k, v] of Object.entries(next)) {
      if (prev[k] === v && el.hasAttribute(k)) {
        continue
      }

      if (!isSafeAttr(k, v)) {
        continue
      }

      el.setAttribute(k, v === true ? '' : v)
    }
  }

  function syncChildren(parent: Element, children: Array<TreeNode>) {
    const want = children.map(build)
    const keep = new Set<ChildNode>(want)

    for (const c of [...parent.childNodes]) {
      if (idOf.has(c) && !keep.has(c)) {
        c.remove()
      }
    }

    let cursor = parent.firstChild

    for (const w of want) {
      while (cursor && cursor !== w && !idOf.has(cursor)) {
        cursor = cursor.nextSibling
      }

      if (cursor === w) {
        cursor = cursor.nextSibling

        continue
      }

      parent.insertBefore(w, cursor)
    }
  }

  function syncPlaceholder(el: Element, n: ElementNode) {
    const empty =
      isContainer(catalog, n.tag) && !n.children.some(c => slotOf(c) === '')

    let ph = placeholders.get(el)

    if (empty) {
      if (!ph) {
        ph = doc.createElement('div')
        ph.className = 'pg-empty'
        placeholders.set(el, ph)
        placeholderOwner.set(ph, n.id)
      }

      ph.textContent = `Drop or click to add to ${displayName(n.tag).toLowerCase()}`

      if (el.lastChild !== ph) {
        el.append(ph)
      }
    } else {
      ph?.remove()
    }
  }

  function build(n: TreeNode): ChildNode {
    const prev = byId.get(n.id)

    if (prev && rendered.get(prev) === n) {
      return prev
    }

    let out: ChildNode

    if (isText(n)) {
      const text =
        prev?.nodeType === Node.TEXT_NODE
          ? (prev as Text)
          : doc.createTextNode('')

      if (text.data !== n.text) {
        text.data = n.text
      }

      out = text
    } else {
      const reuse =
        prev?.nodeType === Node.ELEMENT_NODE &&
        (prev as Element).localName === n.tag

      const el = reuse ? (prev as Element) : doc.createElement(n.tag)
      const before = reuse ? rendered.get(prev) : undefined

      syncAttrs(el, before && !isText(before) ? before.attrs : {}, n.attrs)
      syncChildren(el, n.children)
      syncPlaceholder(el, n)

      out = el
    }

    byId.set(n.id, out)
    idOf.set(out, n.id)
    rendered.set(out, n)

    return out
  }

  return {
    render(nodes: Array<TreeNode>, c: Catalog) {
      if (catalog !== c) {
        // Placeholder rules depend on the catalog; force a full pass.
        catalog = c

        for (const node of byId.values()) {
          rendered.delete(node)
        }
      }

      syncChildren(doc.body, nodes)

      for (const [id, node] of byId) {
        if (!node.isConnected) {
          byId.delete(id)
        }
      }
    },
    element: (id: string) => byId.get(id),

    hit(x: number, y: number) {
      let el: Element | null = doc.elementFromPoint(x, y)

      while (el) {
        const owner = placeholderOwner.get(el)

        if (owner) {
          return { id: owner, placeholder: true }
        }

        const id = idOf.get(el)

        if (id) {
          return { id, placeholder: false }
        }

        // Climb out of shadow roots too (no instanceof: they're another realm's).
        const root = el.getRootNode()

        el =
          el.parentElement ??
          ('host' in root ? (root as ShadowRoot).host : null)
      }

      return null
    },

    /**
     * Polaris hosts are `display: contents`, so their own box is empty; measure
     * what they render instead.
     */
    rect(id: string): DOMRect | null {
      const node = byId.get(id)

      if (!node?.isConnected) {
        return null
      }

      const range = doc.createRange()

      if (node.nodeType === Node.TEXT_NODE) {
        range.selectNodeContents(node)

        return range.getBoundingClientRect()
      }

      const el = node as Element
      const own = el.getBoundingClientRect()

      if (own.width || own.height) {
        return own
      }

      if (el.shadowRoot) {
        range.selectNodeContents(el.shadowRoot)

        const r = range.getBoundingClientRect()

        if (r.width || r.height) {
          return r
        }
      }

      range.selectNodeContents(el)

      return range.getBoundingClientRect()
    },
  }
}
