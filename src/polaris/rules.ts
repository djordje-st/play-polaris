import { displayName, hasDefaultSlot } from './catalog.ts'
import { isText, slotOf, walk } from '../editor/model.ts'
import type { Catalog, PropSpec } from './catalog.ts'
import type { ElementNode, TreeNode } from '../editor/model.ts'

// Slot constraints exist only as prose in the manifest, so they are transcribed here.

type SlotRule = {
  // An omitted allow-list accepts anything; an empty list accepts text only.
  accepts?: Array<string>
  text?: boolean
  max?: number

  variants?: Array<string>
}

type Rule = {
  parents?: Array<string>

  root?: boolean
  slots?: Record<string, SlotRule>
}

const TEXT: SlotRule = { accepts: [], text: true }
const INLINE: SlotRule = {
  accepts: ['s-text', 's-link', 's-number'],
  text: true,
}
const PRIMARY: SlotRule = {
  accepts: ['s-button'],
  max: 1,
  variants: ['primary', 'auto'],
}
const SECONDARY = ['secondary', 'auto']
const LIST: SlotRule = { accepts: ['s-list-item'] }

export const RULES: Record<string, Rule> = {
  's-badge': { slots: { '': TEXT } },
  's-banner': {
    slots: {
      'secondary-actions': {
        accepts: ['s-button'],
        max: 2,
        variants: SECONDARY,
      },
    },
  },
  's-button': { slots: { '': TEXT } },
  's-button-group': {
    slots: {
      '': { accepts: ['s-button'] },
      'primary-action': PRIMARY,
      'secondary-actions': { accepts: ['s-button'], variants: SECONDARY },
    },
  },
  's-chip': { slots: { '': TEXT, graphic: { accepts: ['s-icon'], max: 1 } } },
  's-clickable-chip': {
    slots: { '': TEXT, graphic: { accepts: ['s-icon'], max: 1 } },
  },
  's-choice': { parents: ['s-choice-list'], slots: { '': TEXT } },
  's-choice-list': { slots: { '': { accepts: ['s-choice'] } } },
  's-empty-state': {
    slots: {
      'primary-action': PRIMARY,
      'secondary-actions': {
        accepts: ['s-button'],
        max: 1,
        variants: SECONDARY,
      },
      graphic: { accepts: ['s-image', 's-icon'], max: 1 },
      subheading: { accepts: ['s-text', 's-link'] },
    },
  },
  's-grid-item': { parents: ['s-grid'] },
  's-heading': { slots: { '': TEXT } },
  's-link': { slots: { '': TEXT } },
  's-list-item': { parents: ['s-ordered-list', 's-unordered-list'] },
  's-menu': { slots: { '': { accepts: ['s-button', 's-section'] } } },
  's-modal': {
    slots: {
      'primary-action': PRIMARY,
      'secondary-actions': { accepts: ['s-button'], variants: SECONDARY },
    },
  },
  's-number': { slots: { '': TEXT } },
  's-option': { parents: ['s-select', 's-option-group'], slots: { '': TEXT } },
  's-option-group': {
    parents: ['s-select'],
    slots: { '': { accepts: ['s-option'] } },
  },
  's-ordered-list': { slots: { '': LIST } },
  's-unordered-list': { slots: { '': LIST } },
  's-page': {
    root: true,
    slots: {
      'primary-action': PRIMARY,
      'secondary-actions': {
        accepts: ['s-button', 's-button-group'],
        variants: SECONDARY,
      },
      'breadcrumb-actions': { accepts: ['s-link'] },
    },
  },
  's-paragraph': { slots: { '': INLINE } },
  's-press-button': { slots: { '': TEXT } },
  's-section': {
    slots: {
      'primary-action': { accepts: ['s-button', 's-link'], max: 1 },
      'secondary-actions': {
        accepts: ['s-button', 's-link', 's-button-group'],
      },
      graphic: { accepts: ['s-icon', 's-badge'], max: 1 },
      accessory: {
        accepts: [
          's-badge',
          's-icon',
          's-button',
          's-menu',
          's-text',
          's-avatar',
          's-thumbnail',
          's-tooltip',
        ],
      },
      supplemental: {
        accepts: [
          's-badge',
          's-avatar',
          's-text',
          's-icon',
          's-thumbnail',
          's-tooltip',
        ],
      },
    },
  },
  's-select': { slots: { '': { accepts: ['s-option', 's-option-group'] } } },
  's-table': {
    slots: { '': { accepts: ['s-table-header-row', 's-table-body'] } },
  },
  's-table-header-row': {
    parents: ['s-table'],
    slots: { '': { accepts: ['s-table-header'] } },
  },
  's-table-header': { parents: ['s-table-header-row'], slots: { '': TEXT } },
  's-table-body': {
    parents: ['s-table'],
    slots: { '': { accepts: ['s-table-row', 's-empty-state'] } },
  },
  's-table-row': {
    parents: ['s-table-body'],
    slots: { '': { accepts: ['s-table-cell'] } },
  },
  's-table-cell': { parents: ['s-table-row'] },
  's-text': { slots: { '': INLINE } },
  's-tooltip': {
    slots: { '': { accepts: ['s-text', 's-paragraph'], text: true } },
  },
}

const list = (tags: Array<string>) => {
  const names = tags.map(t => `<${t}>`)

  return names.length < 2
    ? names.join('')
    : `${names.slice(0, -1).join(', ')} or ${names.at(-1)}`
}
const slotName = (slot: string) => (slot ? `the “${slot}” slot` : 'its content')

export function slotRule(
  parentTag: string,
  slot: string
): SlotRule | undefined {
  return RULES[parentTag]?.slots?.[slot]
}

export function describeSlot(parentTag: string, slot: string) {
  const r = slotRule(parentTag, slot)

  if (!r?.accepts) {
    return 'Any component'
  }

  const parts = [...(r.text ? ['text'] : []), ...r.accepts.map(t => `<${t}>`)]
  let s = parts.join(', ') || 'Text'

  if (r.max) {
    s += ` (max ${r.max})`
  }

  if (r.variants) {
    s += ` · variant ${r.variants.join('/')}`
  }

  return s
}

export function isContainer(catalog: Catalog, tag: string) {
  return hasDefaultSlot(catalog.components[tag]) && !slotRule(tag, '')?.text
}

export function placementError(
  catalog: Catalog,
  parentTag: string | null,
  slot: string,
  childTag: string
): string | null {
  const parents = RULES[childTag]?.parents

  if (parents && !(parentTag && parents.includes(parentTag))) {
    return `${displayName(childTag)} must be placed directly inside ${list(parents)}`
  }

  if (parentTag === null) {
    return childTag === '#text'
      ? 'Text needs a component around it, like <s-text>'
      : null
  }

  const spec = catalog.components[parentTag]

  if (!spec) {
    return null
  }

  if (childTag === '#text' && slot) {
    return 'Text can only go in the default slot'
  }

  if (!spec.slots.some(s => s.name === slot)) {
    if (slot) {
      return `${displayName(parentTag)} has no “${slot}” slot`
    }

    const named = spec.slots.map(s => `“${s.name}”`)

    return named.length
      ? `${displayName(parentTag)} only takes content in its ${named.join(', ')} slot${named.length > 1 ? 's' : ''}`
      : `${displayName(parentTag)} can't contain other content`
  }

  const rule = slotRule(parentTag, slot)

  if (!rule?.accepts) {
    return null
  }

  if (childTag === '#text') {
    return rule.text
      ? null
      : `${displayName(parentTag)} doesn't accept text in ${slotName(slot)}`
  }

  if (!rule.accepts.includes(childTag)) {
    return rule.accepts.length
      ? `${slotName(slot).replace(/^./, c => c.toUpperCase())} of ${displayName(parentTag)} only accepts ${list(rule.accepts)}`
      : `${displayName(parentTag)} only accepts text`
  }

  return null
}

export function attrError(prop: PropSpec, value: string | true): string | null {
  if (prop.kind === 'boolean') {
    return null
  }

  if (value === true) {
    return `${prop.name} needs a value`
  }

  if (prop.kind === 'enum' && value !== '' && !prop.options.includes(value)) {
    const sample = prop.options.slice(0, 6).join(', ')

    return `“${value}” isn't a valid ${prop.name}. Use ${sample}${prop.options.length > 6 ? '…' : ''}`
  }

  if (
    prop.kind === 'number' &&
    (value.trim() === '' || Number.isNaN(Number(value)))
  ) {
    return `${prop.name} needs a number`
  }

  return null
}

export type Issue = { id: string; level: 'error' | 'warning'; message: string }

const FORM_CONTROL = (n: ElementNode, catalog: Catalog) => {
  const props = catalog.components[n.tag]?.props ?? []

  return (
    props.some(p => p.name === 'label') && props.some(p => p.name === 'name')
  )
}

// Edits replace node arrays, so array identity is a safe validation cache key.

const validated = new WeakMap<
  Array<TreeNode>,
  { catalog: Catalog; issues: Array<Issue> }
>()

export function validate(
  catalog: Catalog,
  nodes: Array<TreeNode>
): Array<Issue> {
  const cached = validated.get(nodes)

  if (cached?.catalog === catalog) {
    return cached.issues
  }

  const issues: Array<Issue> = []
  const add = (id: string, level: Issue['level'], message: string) =>
    issues.push({ id, level, message })
  const ids = new Map<string, string>()
  const refs: Array<[string, string, string]> = []

  walk(nodes, (n, parent) => {
    const where = parent?.tag ?? null
    const slot = slotOf(n)
    const placement = placementError(catalog, where, slot, n.tag)

    if (isText(n)) {
      if (placement) {
        add(n.id, 'error', placement)
      }

      return
    }

    const spec = catalog.components[n.tag]

    if (!spec) {
      add(n.id, 'error', `<${n.tag}> isn't a Polaris component`)

      return
    }

    if (placement) {
      add(n.id, 'error', placement)
    }

    if (RULES[n.tag]?.root && parent) {
      add(n.id, 'warning', 'Page should be the outermost component')
    }

    for (const [name, value] of Object.entries(n.attrs)) {
      if (name === 'slot') {
        continue
      }

      const prop = spec.props.find(p => p.name === name)
      const problem = prop ? attrError(prop, value) : null

      if (!prop) {
        add(n.id, 'warning', `Unknown property “${name}”`)
      } else if (problem) {
        add(n.id, 'error', problem)
      }

      if (name === 'id' && typeof value === 'string' && value) {
        if (ids.has(value)) {
          add(n.id, 'error', `Duplicate id “${value}”`)
        }

        ids.set(value, n.id)
      }

      if (
        (name === 'commandFor' || name === 'interestFor') &&
        typeof value === 'string' &&
        value
      ) {
        refs.push([n.id, name, value])
      }
    }

    const bySlot = new Map<string, Array<ElementNode>>()

    for (const c of n.children) {
      if (isText(c)) {
        continue
      }

      const group = bySlot.get(slotOf(c)) ?? []

      group.push(c)
      bySlot.set(slotOf(c), group)
    }

    for (const [s, kids] of bySlot) {
      const rule = slotRule(n.tag, s)

      if (rule?.max && kids.length > rule.max) {
        for (const k of kids.slice(rule.max)) {
          add(
            k.id,
            'error',
            `${slotName(s).replace(/^./, c => c.toUpperCase())} of ${displayName(n.tag)} holds at most ${rule.max}`
          )
        }
      }

      if (rule?.variants) {
        for (const k of kids) {
          const v = k.attrs.variant

          if (
            k.tag === 's-button' &&
            typeof v === 'string' &&
            !rule.variants.includes(v)
          ) {
            add(
              k.id,
              'warning',
              `Buttons in “${s}” should use variant ${rule.variants.join(' or ')}`
            )
          }
        }
      }
    }

    if (n.tag === 's-table') {
      const order = n.children.filter(c => !isText(c)).map(c => c.tag)

      if (
        order.indexOf('s-table-header-row') > order.indexOf('s-table-body') &&
        order.includes('s-table-body')
      ) {
        add(n.id, 'warning', 'Put the header row before the table body')
      }
    }

    if (
      n.tag === 's-page' &&
      bySlot.has('aside') &&
      (n.attrs.inlineSize ?? 'base') !== 'base'
    ) {
      add(
        n.id,
        'warning',
        'The aside slot only renders when inlineSize is “base”'
      )
    }

    if (
      FORM_CONTROL(n, catalog) &&
      !n.attrs.label &&
      !n.attrs.accessibilityLabel
    ) {
      add(
        n.id,
        'warning',
        'Add a label. Set labelAccessibilityVisibility="exclusive" to hide it visually'
      )
    }

    if (
      (n.tag === 's-image' ||
        n.tag === 's-avatar' ||
        n.tag === 's-thumbnail') &&
      !('alt' in n.attrs)
    ) {
      add(n.id, 'warning', 'Add alt text, or alt="" if the image is decorative')
    }

    if (
      n.tag === 's-button' &&
      n.attrs.icon &&
      !n.children.length &&
      !n.attrs.accessibilityLabel
    ) {
      add(n.id, 'warning', 'Icon-only buttons need an accessibilityLabel')
    }

    if (n.tag === 's-icon' && !n.attrs.type) {
      add(n.id, 'warning', 'Pick an icon type')
    }
  })

  for (const [id, name, target] of refs) {
    if (!ids.has(target)) {
      add(
        id,
        'warning',
        `${name} points at “${target}”, but no component has that id`
      )
    }
  }

  validated.set(nodes, { catalog, issues })

  return issues
}
