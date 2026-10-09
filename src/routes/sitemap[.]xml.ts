import { createFileRoute } from '@tanstack/solid-router'
import { SITE } from '../site'

// Public pages only: the builder asks not to be indexed.
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () => {
        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE.url}/</loc>
    <lastmod>${SITE.updated}</lastmod>
  </url>
  <url>
    <loc>${SITE.url}/privacy</loc>
    <lastmod>2026-10-09</lastmod>
  </url>
</urlset>
`

        return new Response(body, {
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        })
      },
    },
  },
})
