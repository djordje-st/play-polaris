import { createFileRoute } from '@tanstack/solid-router'
import manifestV1Url from 'polaris-types-v1/custom-elements?url'
import { Builder } from '../components/Builder'
import { Button } from '../components/ui'
import { POLARIS_SCRIPT } from '../polaris/catalog'

// Browser-only APIs require client rendering; the empty server shell stays noindex.

export const Route = createFileRoute('/builder')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Builder · PlayPolaris' },
      {
        name: 'description',
        content:
          'Build Shopify App Home screens with Polaris web components, then export HTML or React JSX.',
      },
      { name: 'robots', content: 'noindex, follow' },
      { name: 'referrer', content: 'no-referrer' },
    ],
    // Preload the default v1 assets to avoid waiting on JavaScript and IndexedDB.
    // Low priority leaves bandwidth for the app bundle.

    links: [
      {
        rel: 'preload',
        href: manifestV1Url,
        as: 'fetch',
        crossOrigin: 'anonymous',
        fetchPriority: 'low',
      },
      {
        rel: 'preload',
        href: POLARIS_SCRIPT.v1,
        as: 'script',
        fetchPriority: 'low',
      },
    ],
  }),
  component: Builder,
  errorComponent: props => (
    <div class="drafting grid h-dvh place-items-center p-6">
      <div class="max-w-md rounded-xl border border-line bg-panel p-6 shadow-sm">
        <p class="font-semibold">The playground hit an error</p>

        <p class="mt-1 text-sm text-ink-2">
          Your pages are saved in this browser. Reloading usually gets you back
          to where you were.
        </p>

        <pre class="mt-3 overflow-auto rounded-md bg-chrome p-2 font-mono text-xs text-danger">
          {props.error.message}
        </pre>

        <Button
          class="mt-4"
          variant="primary"
          onClick={() => location.reload()}
        >
          Reload
        </Button>
      </div>
    </div>
  ),
})
