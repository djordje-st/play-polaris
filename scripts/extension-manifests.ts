// Shopify ships types but no manifest for checkout and customer account
// components, so this turns the types into the manifest shape the catalog reads.
// Run `pnpm generate-manifests` after bumping @shopify/ui-extensions.
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ts from 'typescript'

const ROOT = new URL('..', import.meta.url).pathname
const SURFACES = join(ROOT, 'node_modules/@shopify/ui-extensions/src/surfaces')
const OUT = join(ROOT, 'src/polaris/manifests')
const DOCS = {
  checkout: 'checkout-ui-extensions',
  'customer-account': 'customer-account-ui-extensions',
}

type Surface = keyof typeof DOCS

type Declaration = {
  tagName: string
  name: string
  attributes: Array<object>
  slots: Array<{ name: string; description: string }>
  events: Array<{ name: string; description: string }>
}

// Every element is typed as accepting children; these render none.
const VOID = new Set(
  'avatar checkbox clipboard-item consent-checkbox consent-phone-field date-field date-picker divider drop-zone email-field icon image map-marker money-field number-field password-field payment-icon phone-field product-thumbnail progress qr-code skeleton-paragraph spinner switch text-area text-field url-field'
    .split(' ')
    .map(n => `s-${n}`)
)
// Undocumented, or only meaningful to the host.
const SKIP_TAGS = new Set(['s-chat'])
const SKIP_PROPS = new Set(['key', 'ref', 'children', 'slot'])

const tmp = mkdtempSync(join(tmpdir(), 'manifests-'))
const stub = join(tmp, 'preact.d.ts')
const probe = join(tmp, 'probe.ts')

writeFileSync(
  stub,
  `export type Key = string; export type Ref<T> = { current: T | null }; export type ComponentChildren = unknown;
export declare namespace createElement { namespace JSX { interface IntrinsicElements {} } }
export as namespace preact;`
)
writeFileSync(
  probe,
  `import type { createElement } from 'preact'; export type Elements = createElement.JSX.IntrinsicElements`
)

function declarations(dir: string, surface: Surface) {
  const files = readdirSync(dir)
    .filter(f => f.endsWith('.d.ts') && f !== 'components-shared.d.ts')
    .map(f => join(dir, f))
  const program = ts.createProgram([stub, probe, ...files], {
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    allowImportingTsExtensions: true,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
    types: [],
    paths: { preact: [stub] },
  })
  const checker = program.getTypeChecker()
  const source = program.getSourceFile(probe)!
  const elements = checker.getTypeAtLocation(
    source.statements.find(ts.isTypeAliasDeclaration)!.type
  )
  const doc = (symbol: ts.Symbol) =>
    ts
      .displayPartsToString(symbol.getDocumentationComment(checker))
      .replaceAll('{API_NAME}', DOCS[surface])
      .replaceAll('{API_VERSION}', 'latest')
      .replace(/\]\(\/docs\//g, '](https://shopify.dev/docs/')
      .replace(/\s*\n\s*/g, ' ')
      .trim()
  // Spell unions out so the inspector can offer their values. Shorthand
  // props expand to thousands of combinations; keep only the single keywords.
  const typeText = (type: ts.Type) => {
    if (!type.isUnion()) {
      return checker.typeToString(
        type,
        undefined,
        ts.TypeFormatFlags.NoTruncation
      )
    }

    const big = type.types.length > 80
    const parts = new Set<string>()

    for (const t of type.types) {
      if (t.flags & ts.TypeFlags.BooleanLiteral) {
        parts.add('boolean')
      } else if (!t.isStringLiteral()) {
        parts.add(checker.typeToString(t))
      } else if (big && t.value.includes(' ')) {
        parts.add('string')
      } else {
        parts.add(JSON.stringify(t.value))
      }
    }

    return [...parts].join(' | ')
  }
  const out: Array<Declaration> = []

  for (const el of checker.getPropertiesOfType(elements)) {
    const tagName = el.name

    if (SKIP_TAGS.has(tagName)) {
      continue
    }

    const type = checker.getTypeOfSymbolAtLocation(el, source)
    const attributes: Declaration['attributes'] = []
    const events: Declaration['events'] = []

    for (const prop of checker.getPropertiesOfType(type)) {
      if (SKIP_PROPS.has(prop.name)) {
        continue
      }

      const propType = checker.getNonNullableType(
        checker.getTypeOfSymbolAtLocation(prop, source)
      )

      if (/^on[A-Z]/.test(prop.name)) {
        events.push({
          name: prop.name.slice(2).toLowerCase(),
          description: doc(prop),
        })

        continue
      }

      const fallback = prop
        .getJsDocTags(checker)
        .find(t => t.name === 'default')

      attributes.push({
        name: prop.name.toLowerCase(),
        fieldName: prop.name,
        type: { text: typeText(propType) },
        ...(fallback
          ? { default: ts.displayPartsToString(fallback.text).trim() }
          : {}),
        description: doc(prop),
      })
    }

    // Named slots are documented on a sibling `<Name>ElementSlots` interface.
    const slotsName = `${tagName.slice(2).replaceAll('-', '')}elementslots`
    const slots = VOID.has(tagName)
      ? []
      : [{ name: '', description: 'The content of the component.' }]

    for (const decl of el.declarations ?? []) {
      ts.forEachChild(decl.getSourceFile(), node => {
        if (
          ts.isInterfaceDeclaration(node) &&
          node.name.text.toLowerCase() === slotsName
        ) {
          for (const slot of checker.getPropertiesOfType(
            checker.getTypeAtLocation(node)
          )) {
            if (!slots.some(s => s.name === slot.name)) {
              slots.push({ name: slot.name, description: doc(slot) })
            }
          }
        }
      })
    }

    out.push({
      tagName,
      name: tagName
        .slice(2)
        .replace(/(^|-)(\w)/g, (_, _dash, c) => c.toUpperCase()),
      attributes,
      slots,
      events,
    })
  }

  return out
}

function write(surface: Surface, list: Array<Declaration>) {
  const sorted = list.sort((a, b) => a.tagName.localeCompare(b.tagName))

  // One declaration per line keeps diffs readable when the package updates.
  writeFileSync(
    join(OUT, `${surface}.json`),
    `{"modules":[{"declarations":[\n${sorted.map(d => JSON.stringify(d)).join(',\n')}\n]}]}\n`
  )
  console.log(`${surface}: ${sorted.length} components`)
}

try {
  const checkout = declarations(
    join(SURFACES, 'checkout/components'),
    'checkout'
  )
  const own = declarations(
    join(SURFACES, 'customer-account/components'),
    'customer-account'
  )
  const shared = declarations(
    join(SURFACES, 'checkout/components'),
    'customer-account'
  ).filter(d => !own.some(o => o.tagName === d.tagName))

  write('checkout', checkout)
  write('customer-account', [...shared, ...own])
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
