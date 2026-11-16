// @vitest-environment happy-dom

import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import manifestV2 from 'polaris-types-v2/custom-elements?raw'
import manifestAccount from '../polaris/manifests/customer-account.json?raw'
import { catalogs, resetEditor } from '../test/editor'
import { exportPage, extensionToml } from './codegen'
import { SharedDocument } from './shared'
import * as store from './store'
import type { Doc } from './model'

beforeEach(() =>
  resetEditor('<s-banner heading="Hi">Body</s-banner>', 'checkout')
)
afterEach(() => vi.unstubAllGlobals())

test('a page keeps its target and a project keeps its branding', () => {
  const page = store.currentPage()

  store.setTarget(page.id, 'purchase.thank-you.block.render')
  expect(store.currentPage().target).toBe('purchase.thank-you.block.render')
  store.undo()
  expect(store.currentPage().target).toBeUndefined()
  store.redo()

  store.resetBranding()
  expect(store.canUndo()).toBe(true)
  store.setBranding('accent', '#ff0000')
  store.setBranding('accent', '#00ff00')
  store.setBranding('radiusBase', '0')
  expect(store.editor.state.doc.branding).toEqual({
    accent: '#00ff00',
    radiusBase: '0',
  })
  expect(store.currentProject()!.branding).toBe(store.editor.state.doc.branding)
  store.undo()
  // Typing in one field is one step.
  expect(store.editor.state.doc.branding).toEqual({ accent: '#00ff00' })
  store.undo()
  expect(store.editor.state.doc.branding).toBeUndefined()
  store.redo()
  store.setBranding('accent', null)
  expect(store.editor.state.doc.branding).toEqual({})
  store.setBranding('button', '#111111')

  store.duplicatePage(page.id)
  expect(store.currentPage().target).toBe('purchase.thank-you.block.render')

  const copy = store.duplicateProject(store.editor.state.projectId)!

  expect(copy.branding).toEqual({ button: '#111111' })
  expect(copy.pages.map(p => p.target)).toEqual([
    'purchase.thank-you.block.render',
    'purchase.thank-you.block.render',
  ])
  expect(store.snapshotOf().branding).toEqual({ button: '#111111' })
  store.resetBranding()
  expect(store.editor.state.doc.branding).toBeUndefined()
})

test('a new project starts from its surface starters', () => {
  const project = store.createProject(
    { name: 'Loyalty', version: 'customer-account', template: 'page' },
    catalogs['customer-account']
  )!

  expect(project).toMatchObject({ version: 'customer-account' })
  expect(project.pages[0]).toMatchObject({
    name: 'Extension',
    target: 'customer-account.page.render',
  })
  expect(project.pages[0]!.nodes[0]).toMatchObject({
    tag: 's-page',
    attrs: { heading: 'Extension' },
  })
  expect(store.editor.state.doc.version).toBe('customer-account')
})

test('switching surface opens or starts a project for it', async () => {
  const fetched: Array<string> = []

  vi.stubGlobal('fetch', (url: string) => {
    fetched.push(url)

    return Promise.resolve(
      new Response(
        url.includes('customer-account') ? manifestAccount : manifestV2
      )
    )
  })

  const first = store.editor.state.projectId

  await store.openSurface('checkout')
  expect(store.starterCatalog('checkout')).toBe(catalogs.checkout)
  expect(store.editor.state.projects).toHaveLength(1)

  await store.openSurface('customer-account')
  expect(store.currentProject()).toMatchObject({
    name: 'Customer accounts',
    version: 'customer-account',
  })
  expect(store.currentPage().nodes[0]!.tag).toBe('s-banner')
  expect(fetched).toHaveLength(1)

  await store.openSurface('checkout')
  expect(store.editor.state.projectId).toBe(first)

  await store.openSurface('v2')
  expect(store.currentProject()).toMatchObject({
    name: 'App Home',
    version: 'v2',
  })
  expect(store.currentPage().nodes[0]!.tag).toBe('s-page')

  const home = store.editor.state.projectId

  store.setCatalog(catalogs.v2)
  expect(store.starterCatalog('v1')).toBe(catalogs.v2)
  await store.openSurface('v1')
  expect(store.editor.state.projectId).toBe(home)
  expect(store.editor.state.doc.version).toBe('v1')

  // Back on an extension surface, the App Home project reopens at the asked version.
  await store.openSurface('checkout')
  await store.openSurface('v2')
  expect(store.editor.state.projectId).toBe(home)
  expect(store.editor.state.doc.version).toBe('v2')
  expect(store.editor.state.projects).toHaveLength(3)

  store.setAccess('viewing')
  await store.openSurface('checkout')
  expect(store.editor.state.projectId).toBe(home)
})

test('extension pages export as Preact modules with their targeting', () => {
  const code = exportPage(store.currentPage(), 'checkout', catalogs.checkout, {
    format: 'jsx',
    typescript: true,
    document: false,
    appBridge: false,
  })

  expect(code).toBe(`import '@shopify/ui-extensions/preact'
import { render } from 'preact'

export default function extension() {
  render(<Extension />, document.body)
}

function Extension() {
  return (
    <s-banner heading="Hi">Body</s-banner>
  )
}
`)
  expect(
    extensionToml('Gift "notes"', [
      { file: 'note.jsx', target: 'purchase.checkout.block.render' },
      { file: 'thanks.jsx', target: 'purchase.thank-you.block.render' },
    ])
  )
    .toBe(`# Merge into the shopify.extension.toml that Shopify CLI generated, keeping its uid.
api_version = "2026-10"

[[extensions]]
type = "ui_extension"
name = "Gift \\"notes\\""
handle = "gift-notes"

[[extensions.targeting]]
target = "purchase.checkout.block.render"
module = "./src/note.jsx"

[[extensions.targeting]]
target = "purchase.thank-you.block.render"
module = "./src/thanks.jsx"
`)
})

test('shared rooms sync the surface, targets and branding', () => {
  const shared = new SharedDocument()
  const doc: Doc = {
    version: 'checkout',
    pages: [
      {
        id: 'p',
        name: 'Offer',
        target: 'purchase.thank-you.block.render',
        nodes: [],
      },
    ],
    branding: { accent: '#123456' },
  }

  shared.write({ version: 'checkout', pages: [] }, doc)
  expect(shared.read()).toEqual(doc)
  expect(shared.read()!.branding).toBe(shared.read()!.branding)

  const retargeted = {
    ...doc,
    pages: [{ ...doc.pages[0]!, target: undefined }],
  }

  shared.write(doc, { ...retargeted, branding: undefined })
  expect(shared.read()!.pages[0]!.target).toBeUndefined()
  expect(shared.read()!.branding).toEqual({})

  for (const bad of ['{oops', '"text"']) {
    shared.settings.set('branding', bad)
    expect(shared.read()!.branding).toBeUndefined()
  }

  shared.settings.set('version', 'pos')
  expect(shared.read()).toBeNull()
})
