import { afterEach } from 'vitest'
import { render } from 'solid-js/web'
import type { JSX } from 'solid-js'

const disposers: Array<() => void> = []

// happy-dom does not implement the native popover API or its pseudo-class.
const matches = Element.prototype.matches

Object.defineProperty(Element.prototype, 'matches', {
  configurable: true,
  writable: true,
  value(this: Element, selector: string) {
    return selector === ':popover-open'
      ? this.hasAttribute('data-test-popover-open')
      : matches.call(this, selector)
  },
})

HTMLElement.prototype.showPopover = function () {
  this.setAttribute('data-test-popover-open', '')
  this.dispatchEvent(
    Object.assign(new Event('toggle'), { newState: 'open', oldState: 'closed' })
  )
}

HTMLElement.prototype.hidePopover = function () {
  if (!this.hasAttribute('data-test-popover-open')) {
    return
  }

  this.removeAttribute('data-test-popover-open')
  this.dispatchEvent(
    Object.assign(new Event('toggle'), { newState: 'closed', oldState: 'open' })
  )
}

export function mount(component: () => JSX.Element) {
  const root = document.createElement('div')

  document.body.append(root)
  disposers.push(render(component, root))

  return root
}

export function button(label: string, root: ParentNode = document) {
  const element = [...root.querySelectorAll<HTMLButtonElement>('button')].find(
    candidate =>
      (candidate.getAttribute('aria-label') ?? candidate.textContent.trim()) ===
      label
  )

  if (!element) {
    throw new Error(`Button not found: ${label}`)
  }

  return element
}

export function input(
  selector: string,
  value: string,
  root: ParentNode = document
) {
  const element = root.querySelector<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >(selector)

  if (!element) {
    throw new Error(`Input not found: ${selector}`)
  }

  element.value = value
  element.dispatchEvent(
    new Event(element.tagName === 'SELECT' ? 'change' : 'input', {
      bubbles: true,
    })
  )

  return element
}

export function submit(root: ParentNode = document) {
  root
    .querySelector('form')!
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

afterEach(() => {
  disposers
    .splice(0)
    .reverse()
    .forEach(dispose => dispose())
  document.body.replaceChildren()
})
