// @vitest-environment happy-dom

import { beforeAll, beforeEach, expect, test } from 'vitest'
import '../test/dom'
import { catalogs } from '../test/editor'
import { installElements } from './elements'
import { PALETTE, presetFor } from './library'
import { screenHTML } from './surfaces'
import { targetsOf } from './targets'

const catalog = catalogs['customer-account']
const specs = Object.values(catalog.components)

beforeAll(() =>
  installElements(
    window,
    specs.map(s => s.tag),
    [...new Set(specs.flatMap(s => s.props.map(p => p.name)))]
  )
)
beforeEach(() => document.body.replaceChildren())

function render(html: string) {
  document.body.innerHTML = html

  return document.body.firstElementChild as HTMLElement
}

const shadow = (el: Element | null) => el!.shadowRoot!

test('every preset and mock screen renders without throwing', () => {
  const presets = PALETTE.flatMap(c => c.items)
    .filter(i => catalog.components[i.tag])
    .map(i => presetFor(i.tag, 'customer-account'))

  render(presets.join(''))
  expect(shadow(document.querySelector('s-qr-code')).innerHTML).toContain('svg')
  expect(
    shadow(document.querySelector('s-product-thumbnail')).querySelector('img')
  ).not.toBeNull()

  for (const target of [
    ...targetsOf('checkout'),
    ...targetsOf('customer-account'),
  ]) {
    render(screenHTML(target))
    expect(document.querySelectorAll('.pg-mount')).toHaveLength(1)
  }
})

test('layout properties become styles and unsafe values are dropped', () => {
  const el = render(
    '<s-box padding="base large-200" borderRadius="base max" border="base base dashed" background="subdued" inlineSize="fill" display="none" gap="@container (inline-size > 400px) large, small"></s-box>'
  )

  expect(el.getAttribute('style')).toBe(
    'padding:14px 21px;border-radius:var(--pg-r) 999px;border:1px dashed var(--pg-border);background:var(--pg-subdued-bg);inline-size:100%;display:none;gap:11px'
  )
  el.setAttribute('padding', 'none;} body{color:red')
  // Braces and semicolons can't close the declaration.
  expect(el.getAttribute('style')).toContain('padding:none bodycolor:red;')
  el.setAttribute('border', 'none')
  el.removeAttribute('display')
  expect(el.getAttribute('style')).toContain('border:none')
  expect(el.getAttribute('style')).not.toContain('display')
})

test('fields draw their label, value, state and escaped text', () => {
  const field = render(
    '<s-text-field label="<img src=x onerror=alert(1)>" value="A &quot;quoted&quot; value" error="Required" prefix="$" suffix="kg" icon="lock" placeholder="Type" disabled readOnly></s-text-field>'
  )
  const root = shadow(field)

  expect(root.querySelector('img')).toBeNull()
  expect(root.querySelector('.lo')!.textContent).toBe(
    '<img src=x onerror=alert(1)>'
  )
  expect(root.querySelector('input')!.value).toBe('A "quoted" value')
  expect(root.querySelector('input')!.disabled).toBe(true)
  expect(root.querySelector('.msg')!.textContent).toBe('Required')
  expect(root.querySelector('.field')!.className).toContain('bad')
  expect(root.querySelectorAll('.fix')).toHaveLength(2)

  field.setAttribute('labelAccessibilityVisibility', 'exclusive')
  field.removeAttribute('error')
  expect(shadow(field).querySelector('.field')!.className).toBe('field ph bare')
  expect(
    shadow(
      render('<s-text-area label="Notes" rows="4" value="Hi"></s-text-area>')
    )
      .querySelector('textarea')!
      .getAttribute('rows')
  ).toBe('4')
})

test('selects and choices follow their children', async () => {
  const select = render(
    '<s-select label="Country" placeholder="Pick" value="ca" error="Pick one"><s-option value="us">United States</s-option><s-option value="ca">Canada</s-option></s-select>'
  )
  const options = () => [...shadow(select).querySelectorAll('option')]

  // happy-dom connects the element before its parsed children exist.
  await new Promise(resolve => setTimeout(resolve))
  expect(options().map(o => o.textContent)).toEqual([
    'Pick',
    'United States',
    'Canada',
  ])
  expect(options()[2]!.hasAttribute('selected')).toBe(true)
  select.insertAdjacentHTML('beforeend', '<s-option disabled>Mexico</s-option>')
  await new Promise(resolve => setTimeout(resolve))
  expect(options()).toHaveLength(4)

  const list = render(
    '<s-choice-list label="Speed" variant="inline" error="Choose"><s-choice selected>Standard</s-choice><s-choice>Express</s-choice></s-choice-list>'
  )
  const inputs = () =>
    [...list.querySelectorAll('s-choice')].map(c =>
      shadow(c).querySelector('input')!
    )

  expect(shadow(list).querySelector('legend')!.textContent).toBe('Speed')
  expect(inputs().map(i => [i.type, i.checked])).toEqual([
    ['radio', true],
    ['radio', false],
  ])
  inputs()[1]!.checked = true
  inputs()[1]!.dispatchEvent(new Event('change'))
  expect(inputs()[0]!.checked).toBe(false)

  list.setAttribute('multiple', '')
  await new Promise(resolve => setTimeout(resolve))
  expect(inputs()[0]!.type).toBe('checkbox')
  inputs()[0]!.dispatchEvent(new Event('change'))
  expect(inputs()[1]!.checked).toBe(false)
})

test('content components draw from their attributes', () => {
  render(`
    <s-banner heading="Careful" tone="critical" dismissible>Body</s-banner>
    <s-banner tone="success">Done</s-banner>
    <s-banner>Plain</s-banner>
    <s-badge icon="star-filled">New</s-badge>
    <s-icon type="not-an-icon"></s-icon>
    <s-icon></s-icon>
    <s-avatar initials="JD"></s-avatar>
    <s-avatar src="https://example.com/a.png" alt="Jane"></s-avatar>
    <s-product-thumbnail totalItems="3"></s-product-thumbnail>
    <s-checkbox label="Wrap" checked error="Required"></s-checkbox>
    <s-switch label="SMS" disabled></s-switch>
    <s-details open><s-summary>More</s-summary>Hidden</s-details>
    <s-date-picker value="2026-11-20"></s-date-picker>
    <s-date-picker></s-date-picker>
    <s-drop-zone error="Too large"></s-drop-zone>
    <s-progress value="0.4" tone="critical"></s-progress>
    <s-progress></s-progress>
    <s-section heading="Details" padding="none">Body</s-section>
    <s-section>Body</s-section>
    <s-page heading="Rewards" subheading="Points" inlineSize="large"></s-page>
    <s-payment-icon></s-payment-icon>
    <s-image src="a.png" alt="A" objectFit="cover"></s-image>
    <s-customer-account-action heading="Return"></s-customer-account-action>
    <s-modal heading="Confirm" padding="none" size="small"></s-modal>
  `)

  const html = (selector: string, index = 0) =>
    shadow(document.querySelectorAll(selector)[index]!).innerHTML

  expect(html('s-banner')).toContain('banner critical')
  expect(html('s-banner')).toContain('Careful')
  expect(html('s-banner')).toContain('aria-label="Dismiss"')
  expect(html('s-banner', 2)).toContain('banner auto')
  expect(html('s-badge')).toContain('fill="currentColor"')
  expect(html('s-icon')).toBe(html('s-icon', 1))
  expect(html('s-avatar')).toContain('JD')
  expect(html('s-avatar', 1)).toContain('alt="Jane"')
  expect(html('s-product-thumbnail')).toContain('<b>3</b>')
  expect(html('s-checkbox')).toContain('checked')
  expect(html('s-checkbox')).toContain('Required')
  expect(html('s-switch')).toContain('class="check switch"')
  expect(html('s-details')).toContain('<details open')
  expect(document.querySelector('s-summary')!.slot).toBe('summary')
  expect(html('s-date-picker')).toContain('November 2026')
  expect(html('s-date-picker')).toContain('class="on">20<')
  expect(html('s-date-picker', 1)).not.toContain('class="on"')
  expect(html('s-drop-zone')).toContain('Add file')
  expect(html('s-progress')).toContain('value="0.4"')
  expect(html('s-progress', 1)).not.toContain('value=')
  expect(html('s-section')).toContain('<h2>Details</h2>')
  expect(html('s-section', 1)).not.toContain('<h2>')
  expect(html('s-page')).toContain('<h1>Rewards</h1>')
  expect(html('s-payment-icon')).toContain('card')
  expect(html('s-image')).toContain('object-fit:cover')
  expect(html('s-customer-account-action')).toContain('dialog inline')
  expect(html('s-modal')).toContain('body flush')
})

test('buttons open and close overlays through commandFor and interestFor', () => {
  render(`
    <s-button id="open" commandFor="m">Open</s-button>
    <s-button id="show" commandFor="m" command="--show">Show</s-button>
    <s-button id="hide" commandFor="m" command="--hide">Hide</s-button>
    <s-button id="none" commandFor="missing">Nothing</s-button>
    <s-modal id="m" heading="Title">Body</s-modal>
    <s-button id="menu-button" commandFor="menu">Menu</s-button>
    <s-menu id="menu"><s-button>Edit</s-button></s-menu>
    <s-clickable id="hint" interestFor="tip">?</s-clickable>
    <s-tooltip id="tip">Help</s-tooltip>
    <s-popover id="loose">Loose</s-popover>
  `)

  const click = (el: Element, trusted = false) => {
    const event = new MouseEvent('click', { bubbles: true, composed: true })

    Object.defineProperty(event, 'isTrusted', { value: trusted })
    el.dispatchEvent(event)
  }
  const by = (id: string) => document.getElementById(id)!
  const modal = by('m') as HTMLElement & { shown: boolean }
  const pop = (id: string) => shadow(by(id)).querySelector('[popover]')!

  click(by('none'))
  click(by('open'))
  expect(modal.shown).toBe(true)
  click(by('show'))
  expect(modal.hasAttribute('data-open')).toBe(true)
  click(by('open'))
  expect(modal.shown).toBe(false)
  click(by('show'))
  click(by('hide'))
  expect(modal.shown).toBe(false)
  click(by('show'))
  click(shadow(modal).querySelector('.x')!)
  expect(modal.shown).toBe(false)

  click(by('menu-button'), true)
  expect(pop('menu').matches(':popover-open')).toBe(true)
  expect((pop('menu') as HTMLElement).style.inset).toContain('px')
  click(by('open'), true)
  expect(pop('menu').matches(':popover-open')).toBe(false)

  by('hint').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  expect(pop('tip').matches(':popover-open')).toBe(true)
  by('hint').dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
  expect(pop('tip').matches(':popover-open')).toBe(false)
  ;(by('loose') as HTMLElement & { showOverlay: () => void }).showOverlay()
  expect((pop('loose') as HTMLElement).style.inset).toContain('50%')
})
