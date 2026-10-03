import { POLARIS_SCRIPT } from '../polaris/catalog.ts'
import { isText } from './model.ts'
import type { Catalog } from '../polaris/catalog.ts'
import type { ElementNode, Page, TreeNode, Version } from './model.ts'

// Emit tokens so the export preview can highlight code without another parser.

export type TokenKind =
  'tag' | 'attr' | 'value' | 'text' | 'punct' | 'keyword' | 'plain'

export type Token = { kind: TokenKind; text: string }

export type Format = 'html' | 'jsx'

export type ExportOptions = {
  format: Format

  document: boolean

  appBridge: boolean
  typescript: boolean
}

const WRAP_AT = 80
const INDENT = '  '

const escHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')

type Writer = {
  out: Array<Token>
  emit: (kind: TokenKind, text: string) => void
}

const writer = (): Writer => {
  const out: Array<Token> = []

  return { out, emit: (kind, text) => text && out.push({ kind, text }) }
}

function attrTokens(
  n: ElementNode,
  format: Format,
  catalog: Catalog
): Array<Array<Token>> {
  const spec = catalog.components[n.tag]

  // `slot` first, then the order the author set them in — matches Shopify's docs.
  const entries = Object.entries(n.attrs).sort(
    ([a], [b]) => Number(b === 'slot') - Number(a === 'slot')
  )

  return entries.map(([name, value]) => {
    if (value === true) {
      return [{ kind: 'attr', text: name }]
    }

    const kind = spec?.props.find(p => p.name === name)?.kind

    if (format === 'jsx') {
      if (
        kind === 'number' &&
        value.trim() !== '' &&
        !Number.isNaN(Number(value))
      ) {
        return [
          { kind: 'attr', text: name },
          { kind: 'punct', text: '={' },
          { kind: 'value', text: String(Number(value)) },
          { kind: 'punct', text: '}' },
        ]
      }

      const quoted = /["\\\n]/.test(value)

      return [
        { kind: 'attr', text: name },
        { kind: 'punct', text: quoted ? '={' : '=' },
        { kind: 'value', text: quoted ? JSON.stringify(value) : `"${value}"` },
        ...(quoted ? [{ kind: 'punct' as const, text: '}' }] : []),
      ]
    }

    return [
      { kind: 'attr', text: name },
      { kind: 'punct', text: '=' },
      { kind: 'value', text: `"${escAttr(value)}"` },
    ]
  })
}

const width = (tokens: Array<Token>) =>
  tokens.reduce((n, t) => n + t.text.length, 0)

function textToken(text: string, format: Format): Token {
  if (format === 'jsx' && /[{}<>]/.test(text)) {
    return { kind: 'text', text: `{${JSON.stringify(text)}}` }
  }

  return { kind: 'text', text: format === 'html' ? escHtml(text) : text }
}

function writeNodes(
  w: Writer,
  nodes: Array<TreeNode>,
  depth: number,
  format: Format,
  catalog: Catalog
) {
  nodes.forEach((n, i) => {
    if (i > 0) {
      w.emit('plain', format === 'jsx' ? '\n\n' : '\n')
    }

    writeNode(w, n, depth, format, catalog)
  })
}

function writeNode(
  w: Writer,
  n: TreeNode,
  depth: number,
  format: Format,
  catalog: Catalog,
  inline = false
) {
  const pad = INDENT.repeat(depth)

  if (!inline) {
    w.emit('plain', pad)
  }

  if (isText(n)) {
    return w.emit('text', textToken(n.text, format).text)
  }

  const attrs = attrTokens(n, format, catalog)
  const flat =
    pad.length +
    n.tag.length +
    2 +
    attrs.reduce((sum, a) => sum + width(a) + 1, 0)

  w.emit('punct', '<')
  w.emit('tag', n.tag)

  const wrap = attrs.length > 1 || flat > WRAP_AT

  for (const a of attrs) {
    w.emit('plain', wrap ? `\n${pad}${INDENT}` : ' ')
    a.forEach(t => w.emit(t.kind, t.text))
  }

  if (wrap) {
    w.emit('plain', `\n${pad}`)
  }

  w.emit('punct', '>')

  if (n.children.length) {
    const onlyText = n.children.every(isText)
    const text = n.children.map(c => (isText(c) ? c.text : '')).join('')
    const compact =
      onlyText &&
      !wrap &&
      flat + textToken(text, format).text.length + n.tag.length + 3 <= WRAP_AT

    // Preserve spaces around mixed text: "Hello <s-link>world</s-link>!" must survive.

    if (inline || compact || (!onlyText && n.children.some(isText))) {
      n.children.forEach(c => writeNode(w, c, depth + 1, format, catalog, true))
    } else {
      w.emit('plain', '\n')

      if (onlyText) {
        w.emit('plain', `${pad}${INDENT}`)
        w.emit('text', textToken(text, format).text)
      } else {
        writeNodes(w, n.children, depth + 1, format, catalog)
      }

      w.emit('plain', `\n${pad}`)
    }
  }

  w.emit('punct', '</')
  w.emit('tag', n.tag)
  w.emit('punct', '>')
}

export const componentName = (pageName: string) => {
  const words = pageName
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)

  const base =
    words.map(x => x.charAt(0).toUpperCase() + x.slice(1)).join('') ||
    'Untitled'

  if (/^\d/.test(base)) {
    return `Page${base}`
  }

  return base.endsWith('Page') ? base : `${base}Page`
}

export const fileName = (pageName: string, opts: ExportOptions) => {
  const slug =
    pageName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'page'

  return `${slug}.${opts.format === 'html' ? 'html' : opts.typescript ? 'tsx' : 'jsx'}`
}

export function generate(
  page: Page,
  version: Version,
  catalog: Catalog,
  opts: ExportOptions
): Array<Token> {
  const w = writer()

  if (opts.format === 'jsx') {
    if (opts.typescript) {
      w.emit('keyword', '/// ')
      w.emit('plain', '<reference types="@shopify/polaris-types" />\n\n')
    }

    w.emit('keyword', 'export default function ')
    w.emit('plain', `${componentName(page.name)}() {\n${INDENT}`)

    if (!page.nodes.length) {
      w.emit('keyword', 'return ')
      w.emit('plain', 'null\n}\n')

      return w.out
    }

    w.emit('keyword', 'return ')
    w.emit('plain', '(\n')

    const fragment = page.nodes.length > 1

    if (fragment) {
      w.emit('punct', `${INDENT.repeat(2)}<>\n`)
    }

    writeNodes(w, page.nodes, fragment ? 3 : 2, 'jsx', catalog)

    if (fragment) {
      w.emit('punct', `\n${INDENT.repeat(2)}</>`)
    }

    w.emit('plain', `\n${INDENT})\n}\n`)

    return w.out
  }

  if (!opts.document) {
    writeNodes(w, page.nodes, 0, 'html', catalog)
    w.emit('plain', '\n')

    return w.out
  }

  const head = [
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    ...(opts.appBridge
      ? [
          '<meta name="shopify-api-key" content="%SHOPIFY_API_KEY%" />',
          '<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>',
        ]
      : []),
    `<script src="${POLARIS_SCRIPT[version]}"></script>`,
    `<title>${escHtml(page.name)}</title>`,
  ]

  w.emit('punct', '<!doctype html>\n<html lang="en">\n')
  w.emit('plain', `${INDENT}`)
  w.emit('punct', '<head>\n')

  for (const line of head) {
    w.emit('tag', `${INDENT.repeat(2)}${line}\n`)
  }

  w.emit('plain', INDENT)
  w.emit('punct', '</head>\n')
  w.emit('plain', INDENT)
  w.emit('punct', '<body>\n')

  writeNodes(w, page.nodes, 2, 'html', catalog)

  w.emit('plain', `\n${INDENT}`)
  w.emit('punct', '</body>\n</html>\n')

  return w.out
}

export const tokensToString = (tokens: Array<Token>) =>
  tokens.map(t => t.text).join('')

export const exportPage = (
  page: Page,
  version: Version,
  catalog: Catalog,
  opts: ExportOptions
) => tokensToString(generate(page, version, catalog, opts))

export const toHTML = (nodes: Array<TreeNode>, catalog: Catalog) => {
  const w = writer()

  writeNodes(w, nodes, 0, 'html', catalog)

  return tokensToString(w.out)
}
