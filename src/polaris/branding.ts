// Checkout and customer accounts share one branding configuration. Values are
// kept as strings so the editor and storage need no per-field conversion.

type Field = {
  key: string
  label: string
  group: 'Colors' | 'Typography' | 'Corner radius' | 'Components'
  kind: 'color' | 'number' | 'select'
  default: string
  options?: Array<[value: string, label: string]>
  min?: number
  max?: number
  step?: number
}

// shortcut: system fonts only, because they preview without Shopify's font
// CDN. Add a handle field if merchants need library or custom fonts.
const FONTS: Field['options'] = [
  ['', 'System default'],
  ['helvetica', 'Helvetica'],
  ['arial', 'Arial'],
  ['trebuchet_ms', 'Trebuchet MS'],
  ['verdana', 'Verdana'],
  ['georgia', 'Georgia'],
  ['garamond', 'Garamond'],
  ['times_new_roman', 'Times New Roman'],
  ['courier_new', 'Courier New'],
]

const radius = <TKey extends string>(key: TKey, label: string, value: string) =>
  ({
    key,
    label,
    group: 'Corner radius',
    kind: 'number',
    default: value,
    min: 0,
    max: 40,
    step: 1,
  }) satisfies Field

export const BRANDING_FIELDS = [
  {
    key: 'accent',
    label: 'Accent',
    group: 'Colors',
    kind: 'color',
    default: '#005bd1',
  },
  {
    key: 'button',
    label: 'Buttons',
    group: 'Colors',
    kind: 'color',
    default: '#005bd1',
  },
  {
    key: 'background',
    label: 'Background',
    group: 'Colors',
    kind: 'color',
    default: '#ffffff',
  },
  {
    key: 'text',
    label: 'Text',
    group: 'Colors',
    kind: 'color',
    default: '#000000',
  },
  {
    key: 'border',
    label: 'Borders',
    group: 'Colors',
    kind: 'color',
    default: '#dedede',
  },
  {
    key: 'summary',
    label: 'Order summary',
    group: 'Colors',
    kind: 'color',
    default: '#f5f5f5',
  },
  {
    key: 'font',
    label: 'Body font',
    group: 'Typography',
    kind: 'select',
    default: '',
    options: FONTS,
  },
  {
    key: 'headingFont',
    label: 'Heading font',
    group: 'Typography',
    kind: 'select',
    default: '',
    options: FONTS,
  },
  {
    key: 'fontSize',
    label: 'Base size',
    group: 'Typography',
    kind: 'number',
    default: '14',
    min: 12,
    max: 18,
    step: 1,
  },
  {
    key: 'fontRatio',
    label: 'Scale ratio',
    group: 'Typography',
    kind: 'number',
    default: '1.2',
    min: 1,
    max: 1.4,
    step: 0.05,
  },
  radius('radiusSmall', 'Small', '8'),
  radius('radiusBase', 'Base', '12'),
  radius('radiusLarge', 'Large', '16'),
  {
    key: 'controlBorder',
    label: 'Field borders',
    group: 'Components',
    kind: 'select',
    default: 'FULL',
    options: [
      ['FULL', 'Full'],
      ['NONE', 'None'],
    ],
  },
  {
    key: 'labelPosition',
    label: 'Field labels',
    group: 'Components',
    kind: 'select',
    default: 'INSIDE',
    options: [
      ['INSIDE', 'Inside'],
      ['OUTSIDE', 'Outside'],
    ],
  },
  {
    key: 'buttonCase',
    label: 'Button text',
    group: 'Components',
    kind: 'select',
    default: 'NONE',
    options: [
      ['NONE', 'As written'],
      ['UPPER', 'Uppercase'],
      ['TITLE', 'Title case'],
      ['LOWER', 'Lowercase'],
    ],
  },
  {
    key: 'headerAlignment',
    label: 'Header',
    group: 'Components',
    kind: 'select',
    default: 'START',
    options: [
      ['START', 'Start'],
      ['CENTER', 'Center'],
      ['END', 'End'],
    ],
  },
] as const satisfies ReadonlyArray<Field>

export type BrandingKey = (typeof BRANDING_FIELDS)[number]['key']

export type Branding = Partial<Record<BrandingKey, string>>

const fields: ReadonlyArray<Field> = BRANDING_FIELDS

/** Stored values are untrusted: anything out of range falls back to the default. */
export function resolveBranding(b: Branding = {}) {
  return Object.fromEntries(
    fields.map(f => {
      const v = b[f.key as BrandingKey]
      const n = Number(v)
      const ok =
        typeof v === 'string' &&
        (f.kind === 'color'
          ? /^#[0-9a-f]{6}$/i.test(v)
          : f.kind === 'number'
            ? v !== '' && n >= f.min! && n <= f.max!
            : f.options!.some(o => o[0] === v))

      return [f.key, ok ? v : f.default]
    })
  ) as Record<BrandingKey, string>
}

const FONT_STACK: Record<string, string> = {
  helvetica: 'Helvetica, Arial, sans-serif',
  arial: 'Arial, Helvetica, sans-serif',
  trebuchet_ms: '"Trebuchet MS", sans-serif',
  verdana: 'Verdana, Geneva, sans-serif',
  georgia: 'Georgia, serif',
  garamond: 'Garamond, Baskerville, serif',
  times_new_roman: '"Times New Roman", Times, serif',
  courier_new: '"Courier New", Courier, monospace',
}
const SYSTEM =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const CASE = {
  NONE: 'none',
  UPPER: 'uppercase',
  TITLE: 'capitalize',
  LOWER: 'lowercase',
}

const luminance = (hex: string) =>
  [0.299, 0.587, 0.114].reduce(
    (sum, weight, i) =>
      sum + (weight * parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)) / 255,
    0
  )

/** Custom properties the preview's screens and components are drawn with. */
export function brandingVars(input?: Branding): Record<string, string> {
  const b = resolveBranding(input)
  const size = Number(b.fontSize)
  const ratio = Number(b.fontRatio)
  // Shopify rounds its type scale: 14 at ratio 1.2 gives 12, 16, 18, 20, 24.
  const px = (power: number) => `${Math.round(size * ratio ** power)}px`

  return {
    '--pg-accent': b.accent,
    '--pg-button': b.button,
    '--pg-on-button': luminance(b.button) > 0.55 ? '#000000' : '#ffffff',
    '--pg-bg': b.background,
    '--pg-text': b.text,
    '--pg-border': b.border,
    '--pg-summary': b.summary,
    '--pg-font': FONT_STACK[b.font] ?? SYSTEM,
    '--pg-heading-font': FONT_STACK[b.headingFont] ?? 'var(--pg-font)',
    '--pg-fs': px(0),
    '--pg-fs-small': px(-1),
    '--pg-fs-large': px(0.75),
    '--pg-fs-lead': px(1.4),
    '--pg-fs-xl': px(2),
    '--pg-fs-xxl': px(3),
    '--pg-r-small': `${b.radiusSmall}px`,
    '--pg-r': `${b.radiusBase}px`,
    '--pg-r-large': `${b.radiusLarge}px`,
    '--pg-control-border': b.controlBorder === 'NONE' ? '0px' : '1px',
    // Borderless fields still need an edge to read as inputs.
    '--pg-control-bg':
      b.controlBorder === 'NONE'
        ? 'color-mix(in srgb, var(--pg-text) 6%, var(--pg-bg))'
        : 'var(--pg-bg)',
    '--pg-label-outside': b.labelPosition === 'OUTSIDE' ? '1' : '0',
    '--pg-button-case': CASE[b.buttonCase as keyof typeof CASE],
    '--pg-header-align':
      b.headerAlignment === 'CENTER'
        ? 'center'
        : b.headerAlignment === 'END'
          ? 'flex-end'
          : 'flex-start',
  }
}

const fontGroup = (handle: string) =>
  handle
    ? {
        shopifyFontGroup: {
          baseFontHandle: `${handle}_n4`,
          boldFontHandle: `${handle}_n7`,
        },
      }
    : undefined

/** `CheckoutAndAccountsConfigurationBrandingInput` for the Admin GraphQL API. */
export function brandingInput(input?: Branding) {
  const b = resolveBranding(input)

  return {
    designTokens: {
      cornerRadius: {
        small: Number(b.radiusSmall),
        base: Number(b.radiusBase),
        large: Number(b.radiusLarge),
      },
      typography: {
        size: { base: Number(b.fontSize), ratio: Number(b.fontRatio) },
        primary: fontGroup(b.font),
        secondary: fontGroup(b.headingFont),
      },
    },
    components: {
      shared: { colors: { accent: b.accent, button: b.button } },
      control: { border: b.controlBorder, labelPosition: b.labelPosition },
      primaryButton: { typography: { letterCase: b.buttonCase } },
      header: { alignment: b.headerAlignment },
      main: {
        colors: {
          base: { background: b.background, text: b.text, border: b.border },
        },
      },
    },
    surfaces: {
      checkout: {
        components: {
          orderSummary: { colors: { base: { background: b.summary } } },
        },
      },
    },
  }
}

export const BRANDING_MUTATION = `mutation UpdateBranding(
  $id: ID!
  $configuration: CheckoutAndAccountsConfigurationInput!
) {
  checkoutAndAccountsConfigurationUpdate(id: $id, configuration: $configuration) {
    configuration {
      id
    }
    userErrors {
      field
      message
    }
  }
}
`

export const brandingVariables = (input?: Branding) =>
  `${JSON.stringify(
    {
      id: 'gid://shopify/CheckoutAndAccountsConfiguration/REPLACE_WITH_ID',
      configuration: { branding: brandingInput(input) },
    },
    null,
    2
  )}\n`
