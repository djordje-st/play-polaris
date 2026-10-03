import {
  HeadContent,
  Link,
  ScriptOnce,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/solid-router'
import { HydrationScript } from 'solid-js/web'
import { Suspense } from 'solid-js'
import { THEME_SCRIPT } from '../editor/theme'
import interLatin from '../assets/fonts/inter-latin.woff2?url'
import styleCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Polaris Playground' },
      { name: 'color-scheme', content: 'light dark' },
    ],
    links: [
      {
        rel: 'icon',
        href: '/favicon.png',
        type: 'image/png',
        sizes: '64x64',
      },
      { rel: 'apple-touch-icon', href: '/logo-180.png', sizes: '180x180' },
      { rel: 'manifest', href: '/site.webmanifest' },
      {
        rel: 'preload',
        href: interLatin,
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      { rel: 'stylesheet', href: styleCss },
    ],
  }),
  shellComponent: RootComponent,
  notFoundComponent: NotFound,
})

function NotFound() {
  return (
    <main class="drafting grid min-h-dvh place-items-center p-6">
      <div class="max-w-sm rounded-xl border border-line bg-panel p-6 text-center shadow-sm">
        <h1 class="text-[17px] font-semibold">This page doesn't exist</h1>

        <p class="mt-1 text-sm text-ink-2">
          The link may be old, or the address has a typo.
        </p>

        <div class="mt-4 flex justify-center gap-2 text-sm font-medium">
          <Link
            to="/"
            class="rounded-md border border-line-strong bg-raised px-3 py-1.5 hover:bg-hover"
          >
            Go home
          </Link>

          <Link
            to="/builder"
            class="rounded-md bg-accent px-3 py-1.5 text-on-accent hover:bg-accent-strong"
          >
            Open the builder
          </Link>
        </div>
      </div>
    </main>
  )
}

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HydrationScript />

        <ScriptOnce children={THEME_SCRIPT} />
      </head>

      <body>
        <HeadContent />

        <Suspense>
          <Outlet />
        </Suspense>

        <Scripts />
      </body>
    </html>
  )
}
