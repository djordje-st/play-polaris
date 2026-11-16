// @vitest-environment happy-dom
import { expect, test } from 'vitest'
import { parseHTML } from '../editor/model'
import { catalogs } from '../test/editor'
import { brandingInput, brandingVars, resolveBranding } from './branding'
import {
  CATEGORIES,
  PALETTE,
  docsUrl,
  presetFor,
  templatesFor,
} from './library'
import { validate } from './rules'
import { screenHTML, targetOf, targetsOf } from './surfaces'

const SURFACES = ['checkout', 'customer-account'] as const

test.each(SURFACES)('%s presets and starters are valid there', surface => {
  const catalog = catalogs[surface]
  const sources = [
    ...PALETTE.flatMap(c => c.items)
      .filter(i => catalog.components[i.tag])
      .map(i => [i.tag, presetFor(i.tag, surface)] as const),
    ...templatesFor(surface).map(t => [`template ${t.id}`, t.html] as const),
  ]
  const problems = sources.flatMap(([name, html]) => {
    const { nodes, skipped } = parseHTML(html, catalog)

    return [
      ...skipped.map(s => `${name}: skipped ${s}`),
      ...validate(catalog, nodes)
        // Parts such as options are only valid inside their parent.
        .filter(i => !i.message.includes('must be placed directly inside'))
        .map(i => `${name}: ${i.message}`),
    ]
  })

  expect(problems).toEqual([])
  expect(sources.length).toBeGreaterThan(50)
})

test.each(SURFACES)('%s screens mount every target exactly once', surface => {
  for (const target of targetsOf(surface)) {
    const html = screenHTML(target)

    expect(html.split('class="pg-mount"').length - 1, target).toBe(1)
    expect(html).toContain(`data-target="${target}"`)
  }
})

test('a page falls back to its surface default target', () => {
  expect(targetOf({}, 'checkout')).toBe('purchase.checkout.block.render')
  expect(
    targetOf({ target: 'purchase.thank-you.block.render' }, 'customer-account')
  ).toBe('customer-account.order-status.block.render')
  expect(
    targetOf({ target: 'purchase.thank-you.block.render' }, 'checkout')
  ).toBe('purchase.thank-you.block.render')
})

test('branding ignores invalid values and exports the Admin API input', () => {
  const stored = {
    accent: 'javascript:alert(1)',
    button: '#111111',
    fontSize: '99',
    font: 'georgia',
    labelPosition: 'OUTSIDE',
  }

  expect(resolveBranding(stored)).toMatchObject({
    accent: '#005bd1',
    button: '#111111',
    fontSize: '14',
    labelPosition: 'OUTSIDE',
  })
  expect(brandingVars(stored)).toMatchObject({
    '--pg-on-button': '#ffffff',
    '--pg-label-outside': '1',
  })
  expect(brandingInput(stored)).toMatchObject({
    designTokens: {
      cornerRadius: { small: 8, base: 12, large: 16 },
      typography: {
        size: { base: 14, ratio: 1.2 },
        primary: {
          shopifyFontGroup: {
            baseFontHandle: 'georgia_n4',
            boldFontHandle: 'georgia_n7',
          },
        },
      },
    },
    components: {
      shared: { colors: { accent: '#005bd1', button: '#111111' } },
      control: { border: 'FULL', labelPosition: 'OUTSIDE' },
    },
  })
  expect(brandingInput().designTokens.typography.primary).toBeUndefined()
})

test('docs links and presets follow the surface', () => {
  expect(docsUrl('s-tooltip', 'checkout')).toBe(
    'https://shopify.dev/docs/api/checkout-ui-extensions/latest/web-components/overlays/tooltip'
  )
  expect(docsUrl('s-page', 'customer-account')).toBe(
    'https://shopify.dev/docs/api/customer-account-ui-extensions/latest/web-components/layout-and-structure/page'
  )
  expect(docsUrl('s-tooltip', 'v2')).toContain(
    'app-home/latest/web-components/typography-and-content/tooltip'
  )
  expect(docsUrl('s-summary', 'v1')).toContain('app-home/v1.1')
  expect(presetFor('s-menu', 'customer-account')).not.toContain('icon=')
  expect(presetFor('s-menu')).toContain('icon=')
  expect(CATEGORIES.flatMap(c => c.items).map(i => i.tag)).not.toContain(
    's-qr-code'
  )
})
