import { createFileRoute } from '@tanstack/solid-router'
import { FAQ, FEATURES, SITE, STEPS } from '../site'

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET: () => {
        const body = `# ${SITE.name}

> ${SITE.summary}

${SITE.name} runs in the browser. It loads Shopify's Polaris web components from Shopify's CDN (polaris-1.js for v1, polaris-2.0-rc.js for the 2.0 release candidate) and builds its component catalog from the official @shopify/polaris-types packages. Work is saved in the browser's IndexedDB storage. Optional shared sessions relay edits to other participants without keeping a permanent server copy; anyone with the room link can edit. There are no accounts. It is an independent tool, not made or endorsed by Shopify. Last updated ${SITE.updated}.

## Pages

- [Home](${SITE.url}/): The official website for ${SITE.name}, with features, workflow, and answers to common questions.
- [Builder](${SITE.url}/builder): The app itself. Layers and components on the left, a live Polaris preview in the middle, properties on the right.
- [Privacy policy](${SITE.url}/privacy): Local storage, collaboration, optional analytics, service providers and privacy choices.
- [Source code](${SITE.repository}): The open-source repository, issue tracker, and contribution guide.
- [License](${SITE.repository}/blob/main/LICENSE): MIT License.

## Features

${FEATURES.map(f => `- ${f.title}: ${f.body}`).join('\n')}

## How it works

${STEPS.map((s, i) => `${i + 1}. ${s.title}: ${s.body}`).join('\n')}

## FAQ

${FAQ.map(f => `### ${f.q}\n\n${f.a}`).join('\n\n')}

## Optional

- [Polaris web components documentation](https://shopify.dev/docs/api/app-home/web-components): Shopify's reference for the components the builder uses.
- [WebMCP](https://webmachinelearning.github.io/webmcp/): The browser API AI agents use to work with the builder.
`

        return new Response(body, {
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        })
      },
    },
  },
})
