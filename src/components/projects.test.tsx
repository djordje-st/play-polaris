// @vitest-environment happy-dom

import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { DragDropProvider } from '@dnd-kit/solid'
import { mount, button, input } from '../test/dom'
import { resetEditor } from '../test/editor'
import * as store from '../editor/store'
import { dndPlugins, dndSensors } from '../editor/dnd'
import { edited } from './Projects'
import { Sidebar } from './Sidebar'
import { Toolbar } from './Toolbar'

beforeEach(() => resetEditor('<s-section heading="Actions"></s-section>'))
afterEach(() => {
  store.dismissToast()
  vi.unstubAllGlobals()
})

const dialog = (title: string) =>
  document.querySelector<HTMLDialogElement>(`dialog[aria-label="${title}"]`)!

test('creates, switches, renames and deletes projects from the toolbar', () => {
  const root = mount(() => (
    <Toolbar
      loadingVersion={false}
      agentReady={false}
    />
  ))
  const first = store.currentProject()!

  button('New project', root).click()
  expect(dialog('New project').open).toBe(true)
  input('dialog[aria-label="New project"] input', 'default', root)
  expect(dialog('New project').textContent).toContain(
    'Another project already uses this name'
  )
  input('dialog[aria-label="New project"] input', 'Client', root)
  button('v2, new admin design', root).click()
  button('Create project', root).click()

  const client = store.currentProject()!

  expect(client).toMatchObject({ name: 'Client', version: 'v2' })
  expect(root.textContent).toContain('Client')
  expect(root.textContent).toContain('1 page · v1 · Edited just now')

  ;[
    ...root.querySelectorAll<HTMLButtonElement>(
      '[aria-label="Projects"] li button'
    ),
  ]
    .find(b => b.textContent.startsWith('Default'))!
    .click()
  expect(store.editor.state.projectId).toBe(first.id)

  root
    .querySelector<HTMLLIElement>('[aria-label="Projects"] li')!
    .dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))

  const name = input('[aria-label="Project name"]', 'Client', root)

  name.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
  )
  expect(root.textContent).toContain('Another project already uses this name')
  name.value = 'Main app'
  name.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
  )
  expect(store.currentProject()!.name).toBe('Main app')

  const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValue(true)

  vi.stubGlobal('confirm', confirm)
  ;[...root.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')]
    .filter(b => b.textContent === 'Delete')
    .at(-1)!
    .click()
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining('“Client”'))
  expect(store.editor.state.projects).toHaveLength(2)
  ;[...root.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')]
    .filter(b => b.textContent === 'Delete')
    .at(-1)!
    .click()
  expect(store.editor.state.projects.map(p => p.name)).toEqual(['Main app'])
})

test('pages can be copied to another project from the sidebar', () => {
  const root = mount(() => (
    <DragDropProvider
      plugins={dndPlugins}
      sensors={dndSensors}
    >
      <Sidebar />
    </DragDropProvider>
  ))

  expect(root.textContent).not.toContain('Copy or move to project…')

  const first = store.currentProject()!
  const other = store.createProject({
    name: 'Other',
    version: 'v1',
    template: 'blank',
  })!

  store.openProject(first.id)
  button('Copy or move to project…', root).click()
  expect(dialog('Copy to project').textContent).toContain('Other')
  button('Copy', root).click()
  expect(
    store.editor.state.projects.find(p => p.id === other.id)!.pages
  ).toHaveLength(2)
  expect(store.editor.state.toast?.message).toBe('Copied “Test page” to Other')
})

test('describes edit times relative to now', () => {
  const now = Date.UTC(2026, 0, 10)

  expect(edited(now - 30_000, now)).toBe('Edited just now')
  expect(edited(now - 5 * 60_000, now)).toBe('Edited 5 minutes ago')
  expect(edited(now - 86_400_000, now)).toBe('Edited yesterday')
})
