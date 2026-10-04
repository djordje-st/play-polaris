import { afterEach, expect, test } from 'vitest'
import * as Y from 'yjs'
import { SharedDocument } from './shared'
import { isText, locate, moveNode, updateNode, walk } from './model'
import type { Doc, ElementNode, TreeNode } from './model'

const initial: Doc = {
  version: 'v1',
  pages: [
    {
      id: 'page',
      name: 'Home',
      nodes: [
        {
          id: 'button',
          tag: 's-button',
          attrs: { variant: 'primary' },
          children: [{ id: 'text', tag: '#text', text: 'Hello' }],
        },
        { id: 'section', tag: 's-section', attrs: {}, children: [] },
      ],
    },
  ],
}
const docs: SharedDocument[] = []
const create = (seed?: Doc) => {
  const shared = new SharedDocument()

  docs.push(shared)

  if (seed) {
    shared.write({ version: 'v1', pages: [] }, seed)
  }

  shared.history.clear()

  return shared
}
const sync = (a: SharedDocument, b: SharedDocument) => {
  const aa = Y.encodeStateAsUpdate(a.doc, Y.encodeStateVector(b.doc))
  const bb = Y.encodeStateAsUpdate(b.doc, Y.encodeStateVector(a.doc))

  Y.applyUpdate(a.doc, bb, 'network')
  Y.applyUpdate(b.doc, aa, 'network')
  expect(a.read()).toEqual(b.read())
}
const change = (
  shared: SharedDocument,
  fn: (doc: Doc) => void,
  key?: string
) => {
  const before = shared.read()!
  const after = structuredClone(before)

  fn(after)
  shared.write(before, after, key)
}
const node = (doc: Doc, id: string) => locate(doc.pages[0]!.nodes, id)!.node
const button = (doc: Doc) => node(doc, 'button') as ElementNode

afterEach(() => {
  for (const doc of docs.splice(0)) {
    doc.doc.destroy()
  }
})

test('offline property and text edits converge, and undo removes only this peer’s edits', () => {
  const a = create(initial)
  const b = create()

  expect(b.read()).toBeNull()
  sync(a, b)
  change(
    a,
    doc => {
      button(doc).attrs.variant = 'secondary'
    },
    'variant'
  )
  change(b, doc => {
    button(doc).attrs.disabled = true
  })
  sync(a, b)
  expect(button(a.read()!).attrs).toEqual({
    variant: 'secondary',
    disabled: true,
  })
  a.history.undo()
  sync(a, b)
  expect(button(a.read()!).attrs).toEqual({
    variant: 'primary',
    disabled: true,
  })
  a.history.redo()
  sync(a, b)
  change(
    a,
    doc => {
      ;(node(doc, 'text') as { text: string }).text = 'Hello Alice'
    },
    'text'
  )
  change(
    b,
    doc => {
      ;(node(doc, 'text') as { text: string }).text = 'Hello Bob'
    },
    'text'
  )
  sync(a, b)

  const text = (node(a.read()!, 'text') as { text: string }).text

  expect(text).toContain('Alice')
  expect(text).toContain('Bob')
  change(a, doc => {
    delete button(doc).attrs.disabled
  })
  sync(a, b)
  expect(button(b.read()!).attrs.disabled).toBeUndefined()

  // Reload preserves the CRDT identities; applying the same update again is harmless.
  const reloaded = create()

  sync(a, reloaded)
  sync(a, reloaded)
  expect(reloaded.history.canUndo()).toBe(false)
})

test('moves keep node identity and concurrent property edits; cycles recover deterministically', () => {
  const a = create(initial)
  const b = create()

  sync(a, b)
  change(a, doc => {
    doc.pages[0]!.nodes = moveNode(doc.pages[0]!.nodes, 'button', 'section', 0)
  })
  change(b, doc => {
    button(doc).attrs.tone = 'critical'
  })
  sync(a, b)
  expect(locate(a.read()!.pages[0]!.nodes, 'button')?.parent?.id).toBe(
    'section'
  )
  expect(button(b.read()!).attrs.tone).toBe('critical')
  a.history.undo()
  sync(a, b)
  expect(locate(a.read()!.pages[0]!.nodes, 'button')?.parent).toBeNull()
  change(a, doc => {
    doc.pages[0]!.nodes = moveNode(doc.pages[0]!.nodes, 'button', 'section', 0)
  })
  change(b, doc => {
    doc.pages[0]!.nodes = moveNode(doc.pages[0]!.nodes, 'section', 'button', 0)
  })
  sync(a, b)

  const ids: string[] = []

  walk(a.read()!.pages[0]!.nodes, n => ids.push(n.id))
  expect(ids.sort()).toEqual(['button', 'section', 'text'])
})

test('concurrent inserts, ordering and deletions preserve independent changes', () => {
  const a = create(initial)
  const b = create()

  sync(a, b)
  change(a, doc => {
    doc.pages[0]!.nodes.splice(1, 0, {
      id: 'a',
      tag: 's-divider',
      attrs: {},
      children: [],
    })
  })
  change(b, doc => {
    doc.pages[0]!.nodes.push({
      id: 'b',
      tag: 's-divider',
      attrs: {},
      children: [],
    })
  })
  sync(a, b)
  expect(a.read()!.pages[0]!.nodes.map(n => n.id)).toEqual([
    'button',
    'a',
    'section',
    'b',
  ])
  change(a, doc => {
    doc.pages[0]!.nodes.reverse()
  })
  expect(a.read()!.pages[0]!.nodes.map(n => n.id)).toEqual([
    'b',
    'section',
    'a',
    'button',
  ])
  sync(a, b)
  change(a, doc => {
    doc.pages[0]!.nodes = doc.pages[0]!.nodes.filter(n => n.id !== 'button')
  })
  change(b, doc => {
    button(doc).attrs.tone = 'critical'
  })
  sync(a, b)
  expect(locate(a.read()!.pages[0]!.nodes, 'button')).toBeNull()
  // A new child whose parent was deleted concurrently remains recoverable.
  change(a, doc => {
    doc.pages[0]!.nodes = doc.pages[0]!.nodes.filter(n => n.id !== 'section')
  })
  change(b, doc => {
    ;(node(doc, 'section') as ElementNode).children.push({
      id: 'new',
      tag: '#text',
      text: 'Keep me',
    })
  })
  sync(a, b)
  expect(node(a.read()!, 'new')).toEqual({
    id: 'new',
    tag: '#text',
    text: 'Keep me',
  })
})

test('page names, versions, empty documents and grouped Unicode edits survive round trips', () => {
  const a = create(initial)

  change(a, doc => {
    doc.pages[0]!.name = 'Renamed'
    doc.version = 'v2'
  })
  expect(a.read()!.version).toBe('v2')
  a.history.undo()
  expect(a.read()!.version).toBe('v2')
  expect(a.read()!.pages[0]!.name).toBe('Home')

  for (const text of [
    '😀 Hello 🌎',
    '😁 Hello 🌎',
    '😁 world 🌎',
    '',
    'Done',
  ]) {
    change(
      a,
      doc => {
        ;(node(doc, 'text') as { text: string }).text = text
      },
      'typing'
    )
    expect((node(a.read()!, 'text') as { text: string }).text).toBe(text)
  }

  a.history.undo()
  expect((node(a.read()!, 'text') as { text: string }).text).toBe('Hello')
  change(a, doc => {
    doc.pages.push({ id: 'second', name: 'Second', nodes: [] })
  })

  const b = create()

  sync(a, b)
  change(a, doc => {
    doc.pages = doc.pages.filter(p => p.id !== 'page')
  })
  change(b, doc => {
    doc.pages = doc.pages.filter(p => p.id !== 'second')
  })
  sync(a, b)
  expect(a.read()!.pages).toEqual([{ id: 'empty', name: 'Home', nodes: [] }])
  change(a, doc => {
    doc.pages[0]!.nodes.push({ id: 'new', tag: '#text', text: 'New work' })
  })
  expect(a.read()!.pages[0]!.name).toBe('Home')
  change(a, doc => {
    doc.pages[0]!.name = 'Recovered'
  })
  sync(a, b)
  expect(a.read()!.pages[0]!.name).toBe('Recovered')
})

test('peer content is bounded and sanitized before it reaches the renderer', () => {
  const a = create(initial)
  const r = a.records.get('button')!

  r.set('attr:onclick', 'alert(1)')
  r.set('attr:href', 'javascript:alert(1)')
  r.set('attr:bad name', true)
  r.set('attr:bad-value', {})
  r.set('attr:aria-label', 'Safe')
  a.records.set(
    'script',
    new Y.Map([
      ['tag', 'script'],
      ['placement', { parent: 'page', order: 0 }],
    ] as Array<[string, unknown]>)
  )
  a.records.set(
    'bad-placement',
    new Y.Map([['placement', { parent: 42, order: 'bad' }]])
  )
  a.records.set('not-a-map', 42 as unknown as Y.Map<unknown>)
  a.records.set('bad id', new Y.Map())
  a.records.get('text')!.set('text', 'plain text is not a shared text')
  expect(button(a.read()!).attrs).toEqual({
    variant: 'primary',
    'aria-label': 'Safe',
  })
  expect(button(a.read()!).children).toEqual([])
  expect(a.read()!.pages[0]!.nodes).toHaveLength(2)
  a.records.get('page')!.delete('name')
  expect(a.read()!.pages[0]!.name).toBe('Untitled')
  a.settings.set('version', 'invalid')
  expect(a.read()).toBeNull()
})

test('equal or exhausted numeric positions rebalance and deep trees cannot overflow rendering', () => {
  const a = create(initial)

  a.records.get('button')!.set('placement', { parent: 'page', order: 1 })
  a.records
    .get('section')!
    .set('placement', { parent: 'page', order: 1 + Number.EPSILON })
  change(a, doc => {
    doc.pages[0]!.nodes.splice(1, 0, {
      id: 'middle',
      tag: 's-divider',
      attrs: {},
      children: [],
    })
  })
  expect(a.read()!.pages[0]!.nodes.map(n => n.id)).toEqual([
    'button',
    'middle',
    'section',
  ])

  const root: ElementNode = {
    id: 'root',
    tag: 's-stack',
    attrs: {},
    children: [],
  }
  let parent = root

  for (let i = 0; i < 105; i++) {
    const child: ElementNode = {
      id: `deep-${i}`,
      tag: 's-stack',
      attrs: {},
      children: [],
    }

    parent.children.push(child)
    parent = child
  }

  change(a, doc => {
    doc.pages[0]!.nodes.push(root)
  })

  const all: TreeNode[] = []

  walk(a.read()!.pages[0]!.nodes, n => all.push(n))
  expect(all.filter(n => !isText(n) && n.tag === 's-stack')).toHaveLength(106)
  change(a, doc => {
    doc.pages[0]!.nodes = updateNode(doc.pages[0]!.nodes, 'middle', n => ({
      ...n,
    }))
  })
})
