// @vitest-environment happy-dom

import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { RouterProvider, createMemoryHistory } from '@tanstack/solid-router'
import { mount, button } from './test/dom'
import { getRouter } from './router'
import { FAQ, FEATURES, SITE } from './site'
import { Route as robots } from './routes/robots[.]txt'
import { Route as sitemap } from './routes/sitemap[.]xml'
import { Route as llms } from './routes/llms[.]txt'
import { Route as builder } from './routes/builder'
import { Route as documentRoute } from './routes/__root'
import type { ParentProps } from 'solid-js'

const shell = Reflect.get(documentRoute.options, 'shellComponent')

beforeEach(() => {
  // A DOM mount already has a document; the html/head/body shell belongs to SSR.
  Reflect.set(
    documentRoute.options,
    'shellComponent',
    (props: ParentProps) => props.children
  )
})
afterEach(() => {
  Reflect.set(documentRoute.options, 'shellComponent', shell)
  vi.restoreAllMocks()
})

test('homepage renders content, navigation and canonical production metadata', async () => {
  const router = getRouter()

  router.update({ history: createMemoryHistory({ initialEntries: ['/'] }) })
  await router.load()

  const root = mount(() => <RouterProvider router={router} />)

  await vi.waitFor(() =>
    expect(root.querySelector('h1')?.textContent).toContain('Prototype Shopify')
  )
  expect(router.options.scrollRestoration).toBe(true)
  expect(router.options.defaultPreload).toBe('intent')

  for (const feature of FEATURES) {
    expect(root.textContent).toContain(feature.title)
  }

  for (const item of FAQ) {
    expect(root.textContent).toContain(item.q)
  }

  expect(root.querySelector('a[href="/builder"]')).not.toBeNull()
  expect(root.querySelector('a[href="#main"]')).not.toBeNull()
  expect(root.querySelector(`a[href="${SITE.repository}"]`)).not.toBeNull()

  const screenshot = root.querySelector<HTMLImageElement>('main img')!

  button('Light', root).click()
  expect(screenshot.getAttribute('src')).toBe('/builder-screenshot-light.webp')
  button('Dark', root).click()
  expect(screenshot.getAttribute('src')).toBe('/builder-screenshot-dark.webp')
  button('System', root).click()

  const index = router.state.matches.find(match => match.routeId === '/')!

  expect(index.links).toContainEqual({
    rel: 'canonical',
    href: 'https://playpolaris.dev/',
  })
  expect(index.meta).toEqual(
    expect.arrayContaining([
      { property: 'og:url', content: 'https://playpolaris.dev/' },
      { property: 'og:image', content: 'https://playpolaris.dev/og.png' },
      { name: 'twitter:image', content: 'https://playpolaris.dev/og.png' },
    ])
  )

  const script = index.headScripts?.find(
    entry => entry?.type === 'application/ld+json'
  )
  const graph = JSON.parse(String(script?.children))

  expect(
    graph['@graph'].map((entry: { '@type': string }) => entry['@type'])
  ).toEqual(['WebSite', 'WebApplication', 'FAQPage'])
  expect(graph['@graph'][0]).toMatchObject({
    '@id': 'https://playpolaris.dev/#website',
    url: 'https://playpolaris.dev/',
  })
  expect(graph['@graph'][1]).toMatchObject({
    '@id': 'https://playpolaris.dev/#app',
    url: 'https://playpolaris.dev/builder',
    sameAs: SITE.repository,
    license: `${SITE.repository}/blob/main/LICENSE`,
  })
  expect(graph['@graph'][2]['@id']).toBe('https://playpolaris.dev/#faq')
  expect(graph['@graph'][2].mainEntity).toHaveLength(FAQ.length)
  expect(router.state.matches[0]!.links).toContainEqual(
    expect.objectContaining({ rel: 'manifest', href: '/site.webmanifest' })
  )
})

test('unknown routes render recovery links', async () => {
  const router = getRouter()

  router.update({
    history: createMemoryHistory({ initialEntries: ['/missing-page'] }),
  })
  await router.load()

  const root = mount(() => <RouterProvider router={router} />)

  await vi.waitFor(() =>
    expect(root.textContent).toContain("This page doesn't exist")
  )
  expect(root.querySelector('a[href="/"]')?.textContent).toBe('Go home')
  expect(root.querySelector('a[href="/builder"]')).not.toBeNull()
})

test('builder is client-only, noindex, preloads required assets and offers error recovery', async () => {
  const router = getRouter()

  router.update({
    history: createMemoryHistory({ initialEntries: ['/builder'] }),
  })
  await router.load()

  const match = router.state.matches.find(
    entry => entry.routeId === '/builder'
  )!

  expect(match.meta).toContainEqual({
    name: 'robots',
    content: 'noindex, follow',
  })
  expect(match.links).toContainEqual(
    expect.objectContaining({ rel: 'preload', as: 'script' })
  )
  expect(match.links).toContainEqual(
    expect.objectContaining({ rel: 'preload', as: 'fetch' })
  )
  expect(builder.options.ssr).toBe(false)

  const ErrorScreen = builder.options.errorComponent!

  if (typeof ErrorScreen !== 'function') {
    throw new Error('Expected an error component')
  }

  const reload = vi.spyOn(location, 'reload').mockImplementation(() => {})
  const root = mount(() => (
    <ErrorScreen
      error={new Error('Failed to initialize')}
      reset={() => {}}
    />
  ))

  expect(root.textContent).toContain('Failed to initialize')
  button('Reload', root).click()
  expect(reload).toHaveBeenCalledOnce()
})

test.each([
  ['/robots.txt', robots, 'text/plain'],
  ['/sitemap.xml', sitemap, 'application/xml'],
  ['/llms.txt', llms, 'text/markdown'],
] as const)(
  '%s responds with production URLs even on an alternate host',
  async (path, route, type) => {
    const handlers = route.options.server!.handlers!

    if (typeof handlers === 'function' || typeof handlers.GET !== 'function') {
      throw new Error('Expected a GET handler')
    }

    const response: Response = await Reflect.apply(handlers.GET, undefined, [
      { request: new Request(`https://custom.example${path}`) },
    ])

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe(`${type}; charset=utf-8`)
    expect(response.headers.get('cache-control')).toBe('public, max-age=3600')

    const body = await response.text()

    expect(body).not.toContain('custom.example')

    if (path === '/robots.txt') {
      expect(body).toContain('User-agent: GPTBot\nAllow: /')
      expect(body).toContain('Sitemap: https://playpolaris.dev/sitemap.xml')
    } else if (path === '/sitemap.xml') {
      const xml = new DOMParser().parseFromString(body, 'application/xml')

      expect(xml.querySelector('parsererror')).toBeNull()
      expect(xml.querySelector('loc')?.textContent).toBe(
        'https://playpolaris.dev/'
      )
      expect(xml.querySelector('lastmod')?.textContent).toBe(SITE.updated)
      expect(body).not.toContain('/builder')
    } else {
      expect(body).toContain('[Home](https://playpolaris.dev/)')
      expect(body).toContain('[Builder](https://playpolaris.dev/builder)')
      expect(body).toContain(`[Source code](${SITE.repository})`)
      expect(body).toContain(`[License](${SITE.repository}/blob/main/LICENSE)`)

      for (const item of FAQ) {
        expect(body).toContain(item.a)
      }

      expect(body).toContain(SITE.summary)
    }
  }
)
