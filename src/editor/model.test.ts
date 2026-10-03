// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import { catalogs } from '../test/editor'
import {
  attrIds,
  boundaryOptions,
  cloneFresh,
  contains,
  countNodes,
  insertNodes,
  isSafeAttr,
  locate,
  moveNode,
  parseHTML,
  pathTo,
  removeNode,
  textOf,
  textOnly,
  updateNode,
  visibleRows,
  walk,
  withSlot,
} from './model'
import { toHTML } from './codegen'

const parse = (html: string) => parseHTML(html, catalogs.v1).nodes

test('tree traversal locates text, parents, paths and missing nodes', () => {
  const nodes = parse(
    '<s-section><s-paragraph>Hello <s-link>world</s-link>!</s-paragraph></s-section>'
  )
  const visited: Array<[string, string | null]> = []

  walk(nodes, (node, parent) => visited.push([node.tag, parent?.tag ?? null]))
  expect(visited).toEqual([
    ['s-section', null],
    ['s-paragraph', 's-section'],
    ['#text', 's-paragraph'],
    ['s-link', 's-paragraph'],
    ['#text', 's-link'],
    ['#text', 's-paragraph'],
  ])

  const rows = visibleRows(nodes, {})
  const link = rows.find(row => row.node.tag === 's-link')!.node

  expect(pathTo(nodes, link.id)?.map(node => node.tag)).toEqual([
    's-section',
    's-paragraph',
    's-link',
  ])
  expect(locate(nodes, link.id)?.parent?.tag).toBe('s-paragraph')
  expect(contains(nodes[0]!, link.id)).toBe(true)
  expect(textOf(nodes[0]!)).toBe('Hello world!')
  expect(countNodes(nodes)).toBe(3)
  expect(pathTo(nodes, 'missing')).toBeNull()
  expect(locate(nodes, 'missing')).toBeNull()
  expect(textOnly(parse('<s-paragraph>Text</s-paragraph>')[0]!)).toBe(true)
  expect(textOnly(nodes[0]!)).toBe(false)
})

test('immutable edits retain unrelated subtrees and ignore missing ids', () => {
  const nodes = parse(
    '<s-section><s-button>A</s-button></s-section><s-paragraph>B</s-paragraph>'
  )
  const button = visibleRows(nodes, {})[1]!.node
  const updated = updateNode(nodes, button.id, node =>
    withSlot(node, 'primary-action')
  )

  expect(updated[0]).not.toBe(nodes[0])
  expect(updated[1]).toBe(nodes[1])
  expect(toHTML(nodes, catalogs.v1)).not.toContain('slot=')
  expect(toHTML(updated, catalogs.v1)).toContain('slot="primary-action"')
  expect(updateNode(nodes, 'missing', node => node)).toBe(nodes)
  expect(removeNode(nodes, 'missing')).toBe(nodes)
  expect(withSlot(button, '')).toBe(button)
  expect(withSlot(withSlot(button, 'actions'), '')).toEqual(button)
})

test('moves forward and backward without changing node identities', () => {
  const nodes = parse(
    '<s-button>A</s-button><s-button>B</s-button><s-button>C</s-button>'
  )
  const forward = moveNode(nodes, nodes[0]!.id, null, 3)

  expect(forward.map(textOf)).toEqual(['B', 'C', 'A'])
  expect(forward[2]).toBe(nodes[0])
  expect(moveNode(forward, nodes[0]!.id, null, 0)).toEqual(nodes)
  expect(moveNode(nodes, 'missing', null, 0)).toBe(nodes)
})

test('reparents nodes and refuses cycles', () => {
  const nodes = parse(
    '<s-section><s-stack><s-button>A</s-button></s-stack></s-section><s-section></s-section>'
  )
  const rows = visibleRows(nodes, {})
  const section = nodes[0]!
  const stack = rows[1]!.node
  const button = rows[2]!.node

  expect(moveNode(nodes, section.id, section.id, 0)).toBe(nodes)
  expect(moveNode(nodes, section.id, stack.id, 0)).toBe(nodes)

  const moved = moveNode(nodes, button.id, nodes[1]!.id, 0)

  expect(locate(moved, button.id)?.parent?.id).toBe(nodes[1]!.id)
  expect(locate(nodes, button.id)?.parent?.id).toBe(stack.id)
  expect(countNodes(removeNode(nodes, stack.id))).toBe(2)
  expect(countNodes(insertNodes([], null, 0, nodes))).toBe(4)
})

test('clones paired ids and both kinds of references without altering originals', () => {
  const nodes = parse(
    '<s-button commandFor="target" interestFor="target">Open</s-button><s-modal id="target"></s-modal>'
  )
  const cloned = cloneFresh(nodes, attrIds(nodes))
  const output = document.createElement('template')

  output.innerHTML = toHTML(cloned, catalogs.v1)

  const target = output.content.querySelector('s-modal')!.id
  const trigger = output.content.querySelector('s-button')!

  expect(target).not.toBe('target')
  expect(trigger.getAttribute('commandfor')).toBe(target)
  expect(trigger.getAttribute('interestfor')).toBe(target)
  expect(attrIds(nodes)).toEqual(new Set(['target']))
  expect(cloned[0]!.id).not.toBe(nodes[0]!.id)
})

test('collapsed layers and insertion gaps preserve tree depth', () => {
  const nodes = parse(
    '<s-section><s-stack><s-button>A</s-button></s-stack></s-section><s-button>B</s-button>'
  )
  const rows = visibleRows(nodes, {})

  expect(rows.map(row => row.depth)).toEqual([0, 1, 2, 0])
  expect(
    visibleRows(nodes, { [nodes[0]!.id]: true }).map(row => row.node.tag)
  ).toEqual(['s-section', 's-button'])
  expect(boundaryOptions(nodes, rows, -1)).toEqual([
    { refId: nodes[0]!.id, zone: 'before', depth: 0 },
  ])
  expect(boundaryOptions(nodes, rows, 0)).toEqual([
    { refId: rows[1]!.node.id, zone: 'before', depth: 1 },
  ])
  expect(boundaryOptions(nodes, rows, 2).map(option => option.depth)).toEqual([
    2, 1, 0,
  ])
  expect(boundaryOptions(nodes, rows, 99)).toEqual([])
  expect(boundaryOptions([], [], -1)).toEqual([])
})

describe.each(['v1', 'v2'] as const)('import safety %s', version => {
  test.each([
    'script',
    'style',
    'iframe',
    'object',
    'embed',
    'template',
    'link',
    'meta',
  ])('drops %s content', tag => {
    const { nodes, skipped } = parseHTML(
      `<${tag}>unsafe</${tag}><s-button>Safe</s-button>`,
      catalogs[version]
    )

    expect(skipped).toContain(`<${tag}>`)
    expect(toHTML(nodes, catalogs[version])).not.toContain(`<${tag}`)
    expect(toHTML(nodes, catalogs[version])).toContain(
      '<s-button>Safe</s-button>'
    )
  })

  test('handles comments, whitespace, entities, camelCase and JSX literals', () => {
    const { nodes } = parseHTML(
      `<!-- comment -->{/* jsx comment */}<s-text-field label={'Name'} disabled={false} value={"A &amp; B"} />`,
      catalogs[version]
    )

    expect(toHTML(nodes, catalogs[version]).replace(/\s+/g, ' ')).toBe(
      '<s-text-field label="Name" value="A &amp; B" ></s-text-field>'
    )
    expect(parseHTML(' \n ', catalogs[version]).nodes).toEqual([])
  })
})

test.each([
  ['onclick', 'safe', false],
  ['ONLOAD', true, false],
  ['href', ' javascript:alert(1)', false],
  ['src', '\nVBSCRIPT:bad', false],
  ['href', 'https://example.com', true],
  ['disabled', true, true],
] as const)('attribute safety: %s %s', (name, value, safe) => {
  expect(isSafeAttr(name, value)).toBe(safe)
})
