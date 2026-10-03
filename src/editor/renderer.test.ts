// @vitest-environment happy-dom

import { afterEach, expect, test, vi } from 'vitest'
import { catalogs } from '../test/editor'
import { createRenderer } from './renderer'
import type { ElementNode, TextNode } from './model'

afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
})

test('reconciles attributes, text, order, element types and placeholders without losing runtime nodes', () => {
  const renderer = createRenderer(document)
  const section: ElementNode = {
    id: 'section',
    tag: 's-section',
    attrs: {},
    children: [],
  }

  renderer.render([section], catalogs.v1)

  const host = renderer.element(section.id) as Element
  const placeholder = host.querySelector('.pg-empty')!

  expect(placeholder.textContent).toContain('section')

  const runtimeNode = document.createElement('div')

  host.prepend(runtimeNode)

  const text: TextNode = { id: 'text', tag: '#text', text: 'Hello' }
  const child: ElementNode = {
    id: 'button',
    tag: 's-button',
    attrs: {
      disabled: true,
      id: 'action',
      onclick: 'bad()',
      href: 'javascript:bad()',
    },
    children: [text],
  }

  renderer.render([{ ...section, children: [child] }], catalogs.v1)
  expect(host.contains(runtimeNode)).toBe(true)
  expect(placeholder.isConnected).toBe(false)

  const button = renderer.element(child.id) as Element

  expect(button.getAttribute('disabled')).toBe('')
  expect(button.hasAttribute('onclick')).toBe(false)
  expect(button.hasAttribute('href')).toBe(false)
  button.removeAttribute('id')
  renderer.render(
    [
      {
        ...section,
        children: [
          {
            ...child,
            attrs: { id: 'action' },
            children: [{ ...text, text: 'Changed' }],
          },
        ],
      },
    ],
    catalogs.v1
  )
  expect(renderer.element(child.id)).toBe(button)
  expect(button.getAttribute('id')).toBe('action')
  expect(button.hasAttribute('disabled')).toBe(false)
  expect(button.textContent).toBe('Changed')
  renderer.render([{ ...section, children: [] }], catalogs.v2)
  expect(host.querySelector('.pg-empty')).toBe(placeholder)
  expect(renderer.element(child.id)).toBeUndefined()
  renderer.render([{ ...section, tag: 's-stack' }], catalogs.v2)
  expect((renderer.element(section.id) as Element).localName).toBe('s-stack')
  expect(host.isConnected).toBe(false)
})

test('hit testing finds placeholder owners, component hosts and shadow descendants', () => {
  const renderer = createRenderer(document)
  const section: ElementNode = {
    id: 'section',
    tag: 's-section',
    attrs: {},
    children: [],
  }

  renderer.render([section], catalogs.v1)

  const host = renderer.element(section.id) as Element

  document.elementFromPoint = vi.fn(() => host.querySelector('.pg-empty'))
  expect(renderer.hit(10, 10)).toEqual({ id: section.id, placeholder: true })

  const inner = document.createElement('span')

  host.attachShadow({ mode: 'open' }).append(inner)
  document.elementFromPoint = vi.fn(() => inner)
  expect(renderer.hit(10, 10)).toEqual({ id: section.id, placeholder: false })
  document.elementFromPoint = vi.fn(() => document.body)
  expect(renderer.hit(10, 10)).toBeNull()
})

test('measures host boxes, shadow contents, light contents and text, ignoring detached nodes', () => {
  const renderer = createRenderer(document)
  const text: TextNode = { id: 'text', tag: '#text', text: 'Measure me' }
  const section: ElementNode = {
    id: 'section',
    tag: 's-section',
    attrs: {},
    children: [text],
  }

  renderer.render([section], catalogs.v1)

  const host = renderer.element(section.id) as Element
  const own = new DOMRect(1, 2, 100, 20)

  vi.spyOn(host, 'getBoundingClientRect')
    .mockReturnValueOnce(own)
    .mockReturnValue(new DOMRect())
  expect(renderer.rect(section.id)).toBe(own)

  const contents = new DOMRect(2, 3, 50, 10)
  const measure = vi
    .spyOn(Range.prototype, 'getBoundingClientRect')
    .mockReturnValue(contents)

  expect(renderer.rect(section.id)).toBe(contents)
  host.attachShadow({ mode: 'open' }).textContent = 'Shadow'
  expect(renderer.rect(section.id)).toBe(contents)
  measure.mockReturnValueOnce(new DOMRect()).mockReturnValue(contents)
  expect(renderer.rect(section.id)).toBe(contents)
  expect(renderer.rect(text.id)).toBe(contents)
  expect(renderer.rect('missing')).toBeNull()
  host.remove()
  expect(renderer.rect(section.id)).toBeNull()
})
