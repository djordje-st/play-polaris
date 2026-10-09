// @vitest-environment happy-dom

import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  ANALYTICS_KEY,
  analyticsChoice,
  analyticsPayload,
  startAnalytics,
} from './analytics'
import { PrivacyChoices } from './components/PrivacyChoices'
import { button, mount } from './test/dom'

const payload = {
  website: 'website-id',
  hostname: 'playpolaris.dev',
  url: 'https://playpolaris.dev/builder?room=private-editing-key#secret',
  title: 'Private customer project',
  referrer: 'https://example.org/private?email=person@example.org#secret',
  screen: '1280x800',
  language: 'en',
  id: 'private-user-id',
  data: { project: 'private content' },
}

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('location', new URL('https://playpolaris.dev/builder'))
  vi.stubGlobal('navigator', { doNotTrack: null, globalPrivacyControl: false })
})

afterEach(() => {
  document.getElementById('playpolaris-analytics')?.remove()
  Reflect.deleteProperty(window, 'playpolarisBeforeSend')
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('no analytics request before consent, after refusal or on preview hosts', () => {
  startAnalytics()
  expect(document.querySelector('script[src*="umami"]')).toBeNull()
  expect(analyticsPayload('event', payload)).toBeNull()
  localStorage.setItem(ANALYTICS_KEY, 'denied')
  startAnalytics()
  expect(document.querySelector('script[src*="umami"]')).toBeNull()
  localStorage.setItem(ANALYTICS_KEY, 'allowed')
  vi.stubGlobal('location', new URL('http://localhost:3000'))
  startAnalytics()
  expect(document.querySelector('script[src*="umami"]')).toBeNull()
})

test('consent loads once and only sends known page views without editing keys or content', () => {
  localStorage.setItem(ANALYTICS_KEY, 'allowed')
  startAnalytics()
  startAnalytics()
  expect(document.querySelectorAll('script[src*="umami"]')).toHaveLength(1)
  expect(Reflect.get(window, 'playpolarisBeforeSend')).toBe(analyticsPayload)
  expect(analyticsPayload('event', payload)).toEqual({
    website: 'website-id',
    hostname: 'playpolaris.dev',
    url: '/builder',
    title: 'Builder · PlayPolaris',
    referrer: 'https://example.org',
    screen: '1280x800',
    language: 'en',
  })
  expect(analyticsPayload('identify', payload)).toBeNull()
  expect(
    analyticsPayload('event', { ...payload, name: 'private-event' })
  ).toBeNull()
  expect(
    analyticsPayload('event', { ...payload, url: '/unknown/private-path' })
  ).toBeNull()
  expect(
    analyticsPayload('event', {
      ...payload,
      url: 'https://other.example/builder',
    })
  ).toBeNull()
  expect(analyticsPayload('event', { ...payload, url: 'https://[' })).toBeNull()
  expect(
    analyticsPayload('event', { ...payload, referrer: 'https://[' })
  ).toBeNull()
  expect(
    analyticsPayload('event', { ...payload, url: '/', referrer: '' })?.referrer
  ).toBe('')
  localStorage.setItem(ANALYTICS_KEY, 'denied')
  expect(analyticsPayload('event', payload)).toBeNull()
})

test.each([
  { doNotTrack: '1' },
  { doNotTrack: 'yes' },
  { globalPrivacyControl: true },
])('browser privacy signal overrides earlier consent: %j', signal => {
  localStorage.setItem(ANALYTICS_KEY, 'allowed')
  vi.stubGlobal('navigator', signal)
  startAnalytics()
  expect(document.querySelector('script[src*="umami"]')).toBeNull()
  expect(analyticsPayload('event', payload)).toBeNull()

  const root = mount(() => <PrivacyChoices inline />)

  expect(button('Allow analytics', root).disabled).toBe(true)
  expect(root.querySelector('[role="status"]')?.textContent).toContain('off')
})

test('the banner closes after a choice and stays closed for returning visitors', () => {
  const root = mount(() => <PrivacyChoices />)

  expect(root.querySelector('[role="complementary"]')).not.toBeNull()
  button('Keep analytics off', root).click()
  expect(analyticsChoice()).toBe('denied')
  expect(root.querySelector('[role="complementary"]')).toBeNull()

  const returning = mount(() => <PrivacyChoices />)

  expect(returning.querySelector('[role="complementary"]')).toBeNull()
  expect(document.querySelector('script[src*="umami"]')).toBeNull()
})

test('inline preferences show the current choice and allow withdrawal without a banner', () => {
  const root = mount(() => <PrivacyChoices inline />)

  expect(root.querySelector('[role="complementary"]')).toBeNull()
  expect(root.querySelector('[role="status"]')?.textContent).toContain('off')
  button('Allow analytics', root).click()
  expect(analyticsChoice()).toBe('allowed')
  expect(analyticsPayload('event', payload)).not.toBeNull()
  expect(root.querySelector('[role="status"]')?.textContent).toContain('on')
  button('Keep analytics off', root).click()
  expect(analyticsChoice()).toBe('denied')
  expect(analyticsPayload('event', payload)).toBeNull()
  expect(root.querySelector('[role="status"]')?.textContent).toContain('off')
})

test('blocked storage fails closed and explains why a choice cannot be saved', () => {
  vi.stubGlobal('localStorage', {
    getItem: () => {
      throw new Error('blocked')
    },
    setItem: () => {
      throw new Error('blocked')
    },
  })
  expect(analyticsChoice()).toBeNull()

  const root = mount(() => <PrivacyChoices inline />)

  button('Allow analytics', root).click()
  expect(root.querySelector('[role="alert"]')?.textContent).toContain(
    'Optional analytics stays off'
  )
  expect(document.querySelector('script[src*="umami"]')).toBeNull()
})
