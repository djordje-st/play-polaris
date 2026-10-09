import { createFileRoute } from '@tanstack/solid-router'
import { Home } from '../components/Home'
import { FAQ, FEATURES, SITE } from '../site'
import '../components/Home.css'

export const Route = createFileRoute('/')({
  head: () => {
    const url = `${SITE.url}/`
    const image = `${SITE.url}/og.png`
    const imageAlt =
      'PlayPolaris: free Shopify Polaris UI builder with a real app screen and component inspector'

    const graph = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': `${url}#website`,
          url,
          name: SITE.name,
          description: SITE.description,
          inLanguage: 'en',
        },
        {
          '@type': 'WebApplication',
          '@id': `${url}#app`,
          name: SITE.name,
          url: `${SITE.url}/builder`,
          description: SITE.summary,
          sameAs: SITE.repository,
          license: `${SITE.repository}/blob/main/LICENSE`,
          applicationCategory: 'DeveloperApplication',
          operatingSystem: 'Any',
          browserRequirements: 'Requires JavaScript and a modern web browser',
          isAccessibleForFree: true,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          featureList: [
            ...FEATURES.map(f => f.title),
            'HTML and React JSX export',
            'Real-time collaborative editing',
            'AI agent tools over WebMCP',
          ],
          screenshot: `${SITE.url}/builder-screenshot-light.webp`,
          dateModified: SITE.updated,
          isPartOf: { '@id': `${url}#website` },
        },
        {
          '@type': 'FAQPage',
          '@id': `${url}#faq`,
          mainEntity: FAQ.map(item => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
          })),
        },
      ],
    }

    return {
      meta: [
        { title: SITE.title },
        { name: 'description', content: SITE.description },
        { name: 'robots', content: 'index, follow, max-image-preview:large' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: SITE.name },
        { property: 'og:locale', content: 'en_US' },
        { property: 'og:title', content: SITE.title },
        { property: 'og:description', content: SITE.description },
        { property: 'og:url', content: url },
        { property: 'og:image', content: image },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: imageAlt },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: SITE.title },
        { name: 'twitter:description', content: SITE.description },
        { name: 'twitter:image', content: image },
        { name: 'twitter:image:alt', content: imageAlt },
      ],
      links: [
        { rel: 'canonical', href: url },
        {
          rel: 'preload',
          as: 'image',
          href: '/builder-screenshot-light.avif',
          type: 'image/avif',
          imagesrcset:
            '/builder-screenshot-light-768.avif 768w, /builder-screenshot-light.avif 1280w',
          imagesizes:
            '(max-width: 760px) calc(100vw - 40px), (max-width: 1240px) calc(100vw - 80px), 1160px',
          fetchpriority: 'high',
        },
      ],
      scripts: [
        {
          type: 'application/ld+json',
          // `<` escaped so the JSON can never close its script tag.
          children: JSON.stringify(graph).replace(/</g, '\\u003c'),
        },
      ],
    }
  },
  component: Home,
})
