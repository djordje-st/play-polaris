// @vitest-environment happy-dom

import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { resetEditor } from '../test/editor'
import * as store from './store'

beforeEach(() => {
  vi.useFakeTimers()
  resetEditor('<s-button>Original</s-button>')
})

afterEach(() => {
  store.dismissToast()
  vi.useRealTimers()
})

const project = () => store.currentProject()!

test('the open project mirrors edits, and switching keeps each history', () => {
  const first = project()
  const button = store.currentPage().nodes[0]!.id

  expect(first.pages).toBe(store.editor.state.doc.pages)
  vi.advanceTimersByTime(1000)
  store.setText(button, 'Edited')
  expect(project().pages).toBe(store.editor.state.doc.pages)
  expect(project().updatedAt).toBeGreaterThan(first.updatedAt)

  const second = store.createProject({
    name: 'Second',
    version: 'v2',
    template: 'blank',
  })!

  expect(store.editor.state.projectId).toBe(second.id)
  expect(store.editor.state.doc.version).toBe('v2')
  expect(store.currentPage().name).toBe('Home')
  expect(store.canUndo()).toBe(false)
  store.addPage('Only here', [])
  expect(project().pages).toHaveLength(2)

  store.openProject(first.id)
  expect(store.editor.state.doc.version).toBe('v1')
  expect(store.editor.state.doc.pages.map(p => p.name)).toEqual(['Test page'])
  store.undo()
  expect(store.currentPage().nodes).toMatchObject([
    { children: [{ text: 'Original' }] },
  ])

  store.openProject(second.id)
  expect(store.editor.state.doc.pages).toHaveLength(2)
  store.undo()
  expect(store.editor.state.doc.pages).toHaveLength(1)
})

test('renames, duplicates with fresh ids, and deletes projects', () => {
  const first = project()

  store.renameProject(first.id, 'Client A')
  expect(project().name).toBe('Client A')

  const copy = store.duplicateProject(first.id)!

  expect(copy.name).toBe('Client A copy')
  expect(store.editor.state.projectId).toBe(copy.id)
  expect(copy.pages[0]!.id).not.toBe(first.pages[0]!.id)
  expect(copy.pages[0]!.nodes[0]!.id).not.toBe(first.pages[0]!.nodes[0]!.id)
  expect(store.duplicateProject(first.id)!.name).toBe('Client A copy 2')

  // Deleting the open project opens its neighbour.
  store.deleteProject(store.editor.state.projectId)
  expect(store.editor.state.projects.map(p => p.name)).toEqual([
    'Client A',
    'Client A copy',
  ])
  expect(project().name).toBe('Client A copy')
  store.deleteProject(first.id)
  store.deleteProject(copy.id)
  expect(store.editor.state.projects).toHaveLength(1)
  expect(store.editor.state.toast?.message).toBe(
    'You need at least one project'
  )
})

test('copies and moves pages into another project', () => {
  const first = project()
  const page = store.currentPage()
  const other = store.createProject({
    name: 'Other',
    version: 'v1',
    template: 'blank',
  })!

  store.openProject(first.id)
  store.sendPage(page.id, other.id)

  const copied = store.editor.state.projects.find(p => p.id === other.id)!
  const sent = copied.pages[1]!

  expect(sent.name).toBe('Test page')
  expect(sent.id).not.toBe(page.id)
  expect(sent.nodes[0]!.id).not.toBe(page.nodes[0]!.id)
  expect(store.editor.state.doc.pages).toEqual([page])

  // The only page can't move away.
  store.sendPage(page.id, other.id, true)
  expect(store.editor.state.toast?.message).toBe(
    'A project needs at least one page'
  )

  const second = store.addPage('Second', [])

  store.sendPage(second.id, other.id, true)
  expect(store.editor.state.doc.pages).toEqual([page])
  expect(
    store.editor.state.projects
      .find(p => p.id === other.id)!
      .pages.map(p => p.name)
  ).toEqual(['Home', 'Test page', 'Second'])

  store.editor.state.toast!.action!.run()
  expect(store.editor.state.projectId).toBe(other.id)
  expect(store.currentPage().name).toBe('Second')
})

test('a view-only tab cannot change projects', () => {
  const first = project()

  store.setAccess('viewing')
  expect(
    store.createProject({ name: 'X', version: 'v2', template: 'blank' })
  ).toBeNull()
  expect(store.duplicateProject(first.id)).toBeNull()
  store.renameProject(first.id, 'Renamed')
  store.deleteProject(first.id)
  expect(store.editor.state.projects).toEqual([first])
})
