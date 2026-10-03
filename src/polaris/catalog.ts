import type { Version } from '../editor/model.ts'

export const POLARIS_SCRIPT: Record<Version, string> = {
  v1: 'https://cdn.shopify.com/shopifycloud/polaris-1.js',
  v2: 'https://cdn.shopify.com/shopifycloud/polaris-2.0-rc.js',
}

export const TYPES_PACKAGE: Record<Version, string> = {
  v1: '@shopify/polaris-types@1.1.0',
  v2: '@shopify/polaris-types@2.0.0-rc.1',
}

export const VERSION_LABEL: Record<Version, string> = { v1: 'v1', v2: 'v2 RC' }

export type PropKind = 'enum' | 'boolean' | 'number' | 'string'

export type PropSpec = {
  name: string
  kind: PropKind
  // Open-ended string props reuse enum values as suggestions, not restrictions.
  options: Array<string>
  optionDocs: Record<string, string>
  default?: string
  description: string
  type: string
}

export type SlotSpec = { name: string; description: string }

export type EventSpec = { name: string; description: string }

export type ComponentSpec = {
  tag: string
  className: string
  props: Array<PropSpec>
  slots: Array<SlotSpec>
  events: Array<EventSpec>
}

export type Catalog = {
  version: Version
  components: Record<string, ComponentSpec>
}

type ManifestText = { text?: string }

type ManifestAttr = {
  name: string
  fieldName?: string
  type?: ManifestText
  default?: string
  description?: string
}

export type Manifest = {
  modules: Array<{
    declarations: Array<{
      tagName?: string
      name: string
      attributes?: Array<ManifestAttr>
      slots?: Array<{ name: string; description?: string }>
      events?: Array<{ name: string; description?: string }>
    }>
  }>
}

export function splitUnion(text: string) {
  const parts: Array<string> = []
  let depth = 0
  let quote = ''
  let cur = ''

  for (const ch of text) {
    if (quote) {
      if (ch === quote) {
        quote = ''
      }
    } else if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch
    } else if ('<([{'.includes(ch)) {
      depth++
    } else if ('>)]}'.includes(ch)) {
      depth--
    } else if (ch === '|' && depth === 0) {
      parts.push(cur.trim())
      cur = ''

      continue
    }

    cur += ch
  }

  parts.push(cur.trim())

  return parts.filter(Boolean)
}

export function parseType(
  text = 'string'
): { kind: PropKind; options: Array<string> } | null {
  // Methods and array-valued properties can't be expressed as attributes.
  if (/=>|\[\]$|^readonly /.test(text)) {
    return null
  }

  const parts = splitUnion(text)

  if (parts.includes('boolean')) {
    return { kind: 'boolean', options: [] }
  }

  if (parts.length === 1 && parts[0] === 'number') {
    return { kind: 'number', options: [] }
  }

  const literals = parts
    .filter(p => /^"[^"]*"$/.test(p))
    .map(p => p.slice(1, -1))

  // Size types containing "0" and grid spans typed as just "auto" accept custom CSS values.

  const closed =
    literals.length === parts.length &&
    literals.length > 0 &&
    !(literals.length === 1 && literals[0] === 'auto') &&
    !literals.includes('0')

  return { kind: closed ? 'enum' : 'string', options: literals.filter(Boolean) }
}

function splitDocs(description = '') {
  const [summary = '', ...rest] = description.split(/ - (?=`)/)
  const optionDocs: Record<string, string> = {}

  for (const chunk of rest) {
    const [, value, doc] = /^`([^`]+)`:\s*([\s\S]*)$/.exec(chunk) ?? []

    if (value && doc) {
      optionDocs[value] = doc.trim()
    }
  }

  return { summary: summary.trim(), optionDocs }
}

const cleanDefault = (d?: string) => {
  if (d === undefined) {
    return undefined
  }

  const s = d.replace(/`/g, '').split(' - ')[0]!.trim()

  return /^'([^']*)'/.exec(s)?.[1] ?? s
}

const ID_PROP: PropSpec = {
  name: 'id',
  kind: 'string',
  options: [],
  optionDocs: {},
  description:
    'A unique identifier. Other components point at it through `commandFor` and `interestFor`.',
  type: 'string',
}

export function buildCatalog(version: Version, manifest: Manifest): Catalog {
  const components: Record<string, ComponentSpec> = {}

  for (const mod of manifest.modules) {
    for (const d of mod.declarations) {
      if (!d.tagName) {
        continue
      }

      const props: Array<PropSpec> = []

      for (const a of d.attributes ?? []) {
        const parsed = parseType(a.type?.text)

        // Some list/table parts document `children` as an attribute; it's content.
        if (!parsed || (a.fieldName ?? a.name) === 'children') {
          continue
        }

        const { summary, optionDocs } = splitDocs(a.description)

        props.push({
          name: a.fieldName ?? a.name,
          ...parsed,
          optionDocs,
          default: cleanDefault(a.default),
          description: summary,
          type: a.type?.text ?? 'string',
        })
      }

      if (!props.some(p => p.name === 'id')) {
        props.push(ID_PROP)
      }

      components[d.tagName] = {
        tag: d.tagName,
        className: d.name,
        props,
        // Fields list `error`/`details` as undocumented slots; they're props.
        slots: (d.slots ?? [])
          .filter(s => s.description)
          .map(s => ({ name: s.name, description: s.description ?? '' })),
        events: (d.events ?? []).map(e => ({
          name: e.name,
          description: e.description ?? '',
        })),
      }
    }
  }

  return { version, components }
}

export const displayName = (tag: string) =>
  tag === '#text'
    ? 'Text'
    : tag
        .replace(/^s-/, '')
        .replace(/-/g, ' ')
        .replace(/^./, c => c.toUpperCase())

export const hasDefaultSlot = (spec: ComponentSpec | undefined) =>
  !!spec?.slots.some(s => s.name === '')
