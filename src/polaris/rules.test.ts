// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import { catalogs } from '../test/editor'
import { parseHTML } from '../editor/model'
import {
  buildCatalog,
  displayName,
  hasDefaultSlot,
  parseType,
  splitUnion,
} from './catalog'
import {
  attrError,
  describeSlot,
  isContainer,
  placementError,
  validate,
} from './rules'
import { CATEGORIES, TEMPLATES, docsUrl, entryFor, presetFor } from './library'

test.each([
  ['boolean', { kind: 'boolean', options: [] }],
  ['number', { kind: 'number', options: [] }],
  ['"one" | "two"', { kind: 'enum', options: ['one', 'two'] }],
  ['"neutral"', { kind: 'enum', options: ['neutral'] }],
  ['"auto"', { kind: 'string', options: ['auto'] }],
  ['"0"', { kind: 'string', options: ['0'] }],
  ['"auto" | "0"', { kind: 'string', options: ['auto', '0'] }],
  ['string | "small"', { kind: 'string', options: ['small'] }],
  ['string[]', null],
  ['readonly string[]', null],
  ['() => void', null],
])('parses manifest type %s', (source, expected) => {
  expect(parseType(source)).toEqual(expected)
})

test('splits only top-level union separators', () => {
  expect(
    splitUnion('"a|b" | Map<string, "x" | "y"> | (A | B) | `c|d`')
  ).toEqual(['"a|b"', 'Map<string, "x" | "y">', '(A | B)', '`c|d`'])
  expect(splitUnion(' | ')).toEqual([])
  expect(parseType()).toEqual({ kind: 'string', options: [] })
})

test('builds references while filtering methods and undocumented slots', () => {
  const catalog = buildCatalog('v1', {
    modules: [
      {
        declarations: [
          { name: 'Helper' },
          {
            name: 'Demo',
            tagName: 's-demo',
            attributes: [
              {
                name: 'kind',
                type: { text: '"one" | "two"' },
                default: "`'one'` - default",
                description: 'Choose - `one`: First - `two`: Second',
              },
              { name: 'children' },
              { name: 'run', type: { text: '() => void' } },
              { name: 'other-name', fieldName: 'otherName' },
            ],
            slots: [{ name: 'hidden' }, { name: '', description: 'Content' }],
            events: [{ name: 'change' }],
          },
        ],
      },
    ],
  })

  expect(Object.keys(catalog.components)).toEqual(['s-demo'])
  expect(catalog.components['s-demo']!.props.map(p => p.name)).toEqual([
    'kind',
    'otherName',
    'id',
  ])
  expect(catalog.components['s-demo']!.props[0]).toMatchObject({
    default: 'one',
    optionDocs: { one: 'First', two: 'Second' },
  })
  expect(catalog.components['s-demo']!.events).toEqual([
    { name: 'change', description: '' },
  ])
  expect(hasDefaultSlot(catalog.components['s-demo'])).toBe(true)
  expect(hasDefaultSlot(undefined)).toBe(false)
  expect(displayName('#text')).toBe('Text')
  expect(displayName('s-text-field')).toBe('Text field')
})

describe.each(['v1', 'v2'] as const)('Polaris rules %s', version => {
  const catalog = catalogs[version]

  test.each([
    [null, '', '#text', 'Text needs'],
    ['s-button', '', 's-section', 'only accepts text'],
    ['s-page', 'primary-action', 's-paragraph', 'only accepts'],
    ['s-page', 'missing', 's-button', 'has no'],
    ['s-page', 'primary-action', '#text', 'default slot'],
    ['s-section', '', 's-table-cell', 'directly inside'],
  ])('rejects placement %s/%s/%s', (parent, slot, child, reason) => {
    expect(placementError(catalog, parent, slot, child)).toContain(reason)
  })

  test('describes allowed slots and validates typed attributes', () => {
    expect(describeSlot('s-section', '')).toBe('Any component')
    expect(describeSlot('s-button', '')).toBe('text')
    expect(describeSlot('s-page', 'primary-action')).toContain('max 1')
    expect(isContainer(catalog, 's-section')).toBe(true)
    expect(isContainer(catalog, 's-button')).toBe(false)

    const base = catalog.components['s-button']!.props.find(
      p => p.name === 'variant'
    )!

    expect(attrError(base, true)).toContain('needs a value')
    expect(attrError({ ...base, kind: 'number' }, '')).toContain(
      'needs a number'
    )
    expect(attrError({ ...base, kind: 'number' }, '12')).toBeNull()
    expect(attrError({ ...base, kind: 'boolean' }, true)).toBeNull()
  })

  test.each([
    ['<s-text-field></s-text-field>', 'Add a label'],
    ['<s-image></s-image>', 'Add alt text'],
    ['<s-button icon="plus"></s-button>', 'accessibilityLabel'],
    ['<s-icon></s-icon>', 'Pick an icon'],
    [
      '<s-button commandFor="missing">Open</s-button>',
      'no component has that id',
    ],
    [
      '<s-button id="same">A</s-button><s-button id="same">B</s-button>',
      'Duplicate id',
    ],
    ['<s-page><s-page></s-page></s-page>', 'outermost'],
    ['<s-button unusual="x">A</s-button>', 'Unknown property'],
    [
      '<s-page inlineSize="small"><s-section slot="aside"></s-section></s-page>',
      'aside slot',
    ],
    [
      '<s-table><s-table-body></s-table-body><s-table-header-row></s-table-header-row></s-table>',
      'header row before',
    ],
  ])('reports %s', (html, message) => {
    expect(
      validate(catalog, parseHTML(html, catalog).nodes).some(issue =>
        issue.message.includes(message)
      )
    ).toBe(true)
  })

  test('presets and templates import supported components', () => {
    for (const category of CATEGORIES) {
      for (const item of category.items.filter(
        entry => catalog.components[entry.tag]
      )) {
        const { nodes } = parseHTML(presetFor(item.tag), catalog)

        expect(
          nodes.some(node => node.tag === item.tag),
          item.tag
        ).toBe(true)
        expect(entryFor(item.tag)).toMatchObject(item)
      }
    }

    for (const template of TEMPLATES) {
      expect(parseHTML(template.html, catalog).skipped, template.id).toEqual([])
    }

    expect(presetFor('s-unknown')).toContain('s-unknown')
    expect(docsUrl('s-button', version)).toContain('shopify.dev')
    expect(docsUrl('s-unknown', version)).toBeNull()
  })
})
