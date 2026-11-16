// @vitest-environment happy-dom

import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { button, input, mount } from '../test/dom'
import { resetEditor } from '../test/editor'
import * as store from '../editor/store'
import { Canvas } from './Canvas'
import { ExportDialog } from './ExportDialog'
import { Inspector } from './Inspector'
import { NewPageDialog } from './dialogs'
import { Toolbar } from './Toolbar'

beforeEach(() =>
  resetEditor('<s-banner heading="Hi">Body</s-banner>', 'checkout')
)
afterEach(() => {
  store.dismissToast()
  vi.restoreAllMocks()
})

async function readyFrame() {
  const root = mount(() => <Canvas />)

  // The stand-in components and mock pages load on demand.
  await vi.waitFor(() => expect(root.querySelector('iframe')).not.toBeNull())

  const iframe = root.querySelector('iframe')!
  const doc = iframe.contentDocument!
  const win = iframe.contentWindow!
  const proto = Object.getPrototypeOf(doc.createElement('pg-overlay'))

  proto.showPopover = HTMLElement.prototype.showPopover
  proto.hidePopover = HTMLElement.prototype.hidePopover
  proto.matches = Element.prototype.matches

  proto.scrollIntoView = () => {}

  doc.body.innerHTML = '<div id="pg-screen"></div>'
  vi.spyOn(win, 'requestAnimationFrame').mockImplementation(() => 1)
  vi.spyOn(win, 'cancelAnimationFrame').mockImplementation(() => {})
  iframe.dispatchEvent(new Event('load'))

  return { root, iframe, doc, win }
}

test('canvas draws the mock page, mounts the extension at its target and follows branding', async () => {
  const { root, iframe, doc, win } = await readyFrame()
  const target = () => doc.querySelector('.pg-mount')!

  expect(iframe.srcdoc).toContain('data-surface="checkout"')
  expect(iframe.srcdoc).not.toContain('<script')
  expect(root.textContent).not.toContain("Polaris didn't load")
  expect(target().getAttribute('data-target')).toBe(
    'purchase.checkout.block.render'
  )
  expect(target().querySelector('s-banner')!.getAttribute('heading')).toBe('Hi')
  expect(doc.body.textContent).toContain('Pay now')
  expect(win.customElements.get('s-banner')).toBeDefined()
  expect(doc.documentElement.style.getPropertyValue('--pg-accent')).toBe(
    '#005bd1'
  )

  store.setBranding('accent', '#ff0000')
  expect(doc.documentElement.style.getPropertyValue('--pg-accent')).toBe(
    '#ff0000'
  )

  const banner = target().querySelector('s-banner')

  store.setTarget(store.currentPage().id, 'purchase.thank-you.block.render')
  expect(doc.body.textContent).toContain('Thank you, Jane!')
  expect(target().querySelector('s-banner')).toBe(banner)

  store.replacePage([])
  expect(target().children).toHaveLength(0)
  expect(root.textContent).not.toContain('This page is empty')
})

test('selecting a stand-in overlay reveals it in design mode', async () => {
  store.replacePage(
    store.parse(
      '<s-button commandFor="m">Open</s-button><s-modal id="m" heading="Title">Body</s-modal><s-button interestFor="t">Hint</s-button><s-tooltip id="t">Tip</s-tooltip>'
    ).nodes
  )

  const { doc } = await readyFrame()
  const [, modal, , tooltip] = store.currentPage().nodes

  store.select(modal!.id)
  expect(doc.querySelector('s-modal')!.hasAttribute('data-open')).toBe(true)
  store.select(tooltip!.id)
  expect(doc.querySelector('s-modal')!.hasAttribute('data-open')).toBe(false)
  expect(
    doc
      .querySelector('s-tooltip')!
      .shadowRoot!.querySelector('[popover]')!
      .matches(':popover-open')
  ).toBe(true)
})

test('the inspector edits the target and the branding, and exports it', () => {
  const root = mount(() => <Inspector />)

  expect(root.textContent).toContain('Merchants place block targets')
  input(
    '[aria-label="Extension target"]',
    'purchase.checkout.cart-line-item.render-after',
    root
  )
  expect(store.currentPage().target).toBe(
    'purchase.checkout.cart-line-item.render-after'
  )
  expect(root.textContent).toContain('repeats this target for every item')
  input(
    '[aria-label="Extension target"]',
    'purchase.checkout.header.render-after',
    root
  )
  expect(root.textContent).toContain('marks where Shopify renders')

  const control = (label: string) =>
    [...root.querySelectorAll('label')]
      .find(l => l.textContent.startsWith(label))!
      .querySelector<HTMLInputElement | HTMLSelectElement>('input, select')!
  const set = (label: string, value: string, type = 'change') => {
    control(label).value = value
    control(label).dispatchEvent(new Event(type, { bubbles: true }))
  }

  expect(button('Reset', root).disabled).toBe(true)
  set('Accent', '#ff0000', 'input')
  set('Base size', '16')
  set('Field labels', 'OUTSIDE')
  expect(store.editor.state.doc.branding).toEqual({
    accent: '#ff0000',
    fontSize: '16',
    labelPosition: 'OUTSIDE',
  })
  set('Base size', '')
  expect(store.editor.state.doc.branding).not.toHaveProperty('fontSize')
  expect(control('Base size').value).toBe('14')

  button('Export', root).click()

  const dialog = root.querySelector<HTMLDialogElement>(
    'dialog[aria-label="Export code"]'
  )!

  expect(dialog.open).toBe(true)
  expect(dialog.textContent).toContain('branding.variables.json')
  expect(dialog.querySelector('pre')!.textContent).toContain(
    'checkoutAndAccountsConfigurationUpdate'
  )
  button('Close', dialog).click()
  button('Reset', root).click()
  expect(store.editor.state.doc.branding).toBeUndefined()
})

test('export offers the extension modules, their config and the branding', () => {
  store.addPage('Thanks', [], 'purchase.thank-you.block.render')

  const root = mount(() => (
    <ExportDialog
      open
      onClose={() => {}}
    />
  ))
  const tabs = () =>
    [...root.querySelectorAll('[role="tab"]')].map(t => t.textContent)
  const code = () => root.querySelector('pre')!.textContent
  const radio = (label: string) =>
    [...root.querySelectorAll<HTMLButtonElement>('[role="radio"]')].find(
      r => r.textContent === label
    )!

  expect(root.textContent).toContain('Preact modules for checkout')
  expect(root.textContent).toContain('--template checkout_ui')
  expect(tabs()).toEqual(['thanks.tsx', 'shopify.extension.toml'])
  expect(code()).toContain("import '@shopify/ui-extensions/preact'")

  radio('All (2)').click()
  expect(tabs()).toEqual([
    'test-page.tsx',
    'thanks.tsx',
    'shopify.extension.toml',
  ])
  root.querySelectorAll<HTMLButtonElement>('[role="tab"]')[2]!.click()
  expect(code()).toContain('target = "purchase.checkout.block.render"')
  expect(code()).toContain('module = "./src/thanks.tsx"')

  store.setBranding('button', '#111111')
  radio('Branding').click()
  expect(tabs()).toEqual(['branding.graphql', 'branding.variables.json'])
  root.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1]!.click()
  expect(code()).toContain('"button": "#111111"')
  expect(root.textContent).toContain('checkoutAndAccountsConfigurations')
})

test('the toolbar and dialogs offer each surface and its starters', async () => {
  const root = mount(() => (
    <>
      <Toolbar
        loadingVersion={false}
        agentReady={false}
      />
      <NewPageDialog
        open
        onClose={() => {}}
      />
    </>
  ))
  const surfaces = () =>
    [
      ...root.querySelectorAll(
        '[aria-label="Surface and Polaris version"] button'
      ),
    ].map(b => b.textContent)
  const project = root.querySelector('dialog[aria-label="New project"]')!
  const page = root.querySelector('dialog[aria-label="New page"]')!

  expect(surfaces()).toEqual(['v2', 'v1', 'Checkout', 'Accounts'])
  expect(page.textContent).toContain('Each page is one extension')
  expect(page.textContent).toContain('Product offer')
  expect(page.textContent).not.toContain('Full page')
  input('dialog[aria-label="New page"] input', 'Offer', root)
  ;[...page.querySelectorAll('label')]
    .find(l => l.textContent.includes('Product offer'))!
    .querySelector('input')!
    .dispatchEvent(new Event('change', { bubbles: true }))
  button('Create page', page).click()
  expect(store.currentPage()).toMatchObject({ name: 'Offer' })
  expect(store.currentPage().nodes[0]!.tag).toBe('s-stack')

  // The starters follow the chosen surface.
  button('New project', root).click()
  expect(project.textContent).toContain('Notice')
  button('Customer accounts', project).click()
  expect(project.textContent).toContain('Full page')
  button('App Home v2', project).click()
  expect(project.textContent).toContain('Empty state')
  button('App Home v1', project).click()
  button('Checkout', project).click()
  input('dialog[aria-label="New project"] input', 'Upsells', root)
  button('Create project', project).click()
  expect(store.currentProject()).toMatchObject({
    name: 'Upsells',
    version: 'checkout',
  })
  expect(root.textContent).toContain('1 page · Checkout')

  const failed = vi
    .spyOn(globalThis, 'fetch')
    .mockRejectedValue(new Error('Offline'))

  button('Accounts', root).click()
  await vi.waitFor(() =>
    expect(store.editor.state.toast?.message).toBe('Offline')
  )
  button('New project', root).click()
  button('Customer accounts', project).click()
  input('dialog[aria-label="New project"] input', 'Portal', root)
  button('Create project', project).click()
  await vi.waitFor(() => expect(failed).toHaveBeenCalledTimes(2))
  expect(store.currentProject()!.name).toBe('Upsells')

  store.setRoom({ id: 'room', status: 'connected', peers: 1 })
  expect(surfaces()).toEqual(['Checkout'])
})
