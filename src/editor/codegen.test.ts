import assert from 'node:assert/strict'
import { test } from 'vitest'
import { exportPage, generate, toHTML, tokensToString } from './codegen.ts'
import type { Catalog } from '../polaris/catalog.ts'
import type { Page, TextNode } from './model.ts'

const catalog: Catalog = { version: 'v1', components: {} }
const text = (value: string): TextNode => ({
  id: value,
  tag: '#text',
  text: value,
})
const page: Page = {
  id: 'page',
  name: 'Home',
  nodes: [
    {
      id: 'button',
      tag: 's-button',
      attrs: { variant: 'primary', slot: 'primary-action' },
      children: [text('Save'), text(' changes')],
    },
    {
      id: 'paragraph',
      tag: 's-paragraph',
      attrs: {},
      children: [
        text('Read '),
        {
          id: 'link',
          tag: 's-link',
          attrs: { href: '/docs', target: '_blank' },
          children: [text('the docs')],
        },
        text('!'),
      ],
    },
    {
      id: 'image',
      tag: 's-image',
      attrs: { src: `https://example.com/${'a'.repeat(80)}.png` },
      children: [],
    },
  ],
}

for (const format of ['html', 'jsx'] as const) {
  test(`${format}: wraps attributes and text without changing inline spacing`, () => {
    const options = {
      format,
      document: false,
      appBridge: false,
      typescript: true,
    }
    const code = tokensToString(generate(page, 'v1', catalog, options))

    assert.match(
      code,
      /<s-button\n +slot="primary-action"\n +variant="primary"\n *>\n +Save changes\n *<\/s-button>/
    )
    assert.match(
      code,
      /<s-paragraph>Read <s-link\n +href="\/docs"\n +target="_blank"\n +>the docs<\/s-link>!<\/s-paragraph>/
    )
    assert.match(
      code,
      /<s-image\n +src="https:\/\/example.com\/a+\.png"\n *><\/s-image>/
    )
    assert.equal(code, exportPage(page, 'v1', catalog, options))

    if (format === 'html') {
      assert.equal(code, `${toHTML(page.nodes, catalog)}\n`)
      assert.ok(
        exportPage(page, 'v1', catalog, {
          ...options,
          document: true,
        }).startsWith('<!doctype html>\n')
      )
    } else {
      assert.match(code, /<\/s-button>\n\n +<s-paragraph>/)
      assert.match(code, /<\/s-paragraph>\n\n +<s-image/)

      assert.match(
        code,
        /export default function HomePage\(\) \{\n {2}return \(\n {4}<>\n/
      )
    }
  })
}
