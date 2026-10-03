import { createFileRoute } from '@tanstack/solid-router'
import { SITE } from '../site'

const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
]

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () => {
        const body = [
          'User-agent: *',
          'Allow: /',
          '',
          ...AI_CRAWLERS.flatMap(bot => [`User-agent: ${bot}`, 'Allow: /', '']),
          `Sitemap: ${SITE.url}/sitemap.xml`,
          '',
        ].join('\n')

        return new Response(body, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        })
      },
    },
  },
})
