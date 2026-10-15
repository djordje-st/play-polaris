import type { IconName } from './components/ui'

export const SITE = {
  name: 'PlayPolaris',
  url: 'https://playpolaris.dev',
  repository: 'https://github.com/djordje-st/play-polaris',
  title: 'Shopify Polaris UI Builder & Components Playground | PlayPolaris',
  description:
    'Build Shopify app UI with real Polaris web components. Drag and drop, start from app templates, and export React JSX or HTML. Free, open source, no signup.',
  summary:
    'A free, open-source Shopify Polaris playground and UI builder. Compose App Home screens from real Polaris web components, validate nesting and slots, start from app templates, collaborate in shared sessions, work with AI agents over WebMCP, and export React JSX or HTML.',
  imageAlt:
    'PlayPolaris, a free Shopify Polaris UI builder, showing a real App Home screen and the component inspector',
  updated: '2026-10-15',
} as const

export function pageHead(path: string, title: string, description: string) {
  const url = `${SITE.url}${path}`
  const image = `${SITE.url}/og.png`

  return {
    url,
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'robots', content: 'index, follow, max-image-preview:large' },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: SITE.name },
      { property: 'og:locale', content: 'en_US' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: url },
      { property: 'og:image', content: image },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: SITE.imageAlt },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: image },
      { name: 'twitter:image:alt', content: SITE.imageAlt },
    ],
    links: [{ rel: 'canonical', href: url }],
  }
}

export const FEATURES: Array<{
  icon: IconName
  title: string
  body: string
  detail: string
}> = [
  {
    icon: 'desktop',
    title: 'Real Polaris web components',
    body: "Build with Shopify's actual Polaris runtime, not lookalikes. Switch between Polaris v1 and the 2.0 release candidate, and interact with your screen as you go.",
    detail: 'Shopify CDN runtime · v1 and 2.0 RC',
  },
  {
    icon: 'check',
    title: 'Polaris nesting and slot validation',
    body: "Catch invalid nesting, misplaced slots, bad property values and accessibility gaps while you build. When a drop isn't allowed, the checker says why.",
    detail: 'Live validation · Clear explanations',
  },
  {
    icon: 'blocks',
    title: 'Shopify app UI templates and drag and drop',
    body: 'Start from a home, index, details, settings or empty-state template. Drag from the component palette, reorder layers, or add components in place.',
    detail: '5 starter templates · Drag and drop',
  },
  {
    icon: 'mobile',
    title: 'Responsive preview for desktop, tablet and mobile',
    body: 'Switch the canvas between viewport sizes and check how your Shopify admin layout adapts before it reaches your codebase.',
    detail: 'Desktop · Tablet · Mobile',
  },
  {
    icon: 'component',
    title: 'Reusable saved components',
    body: 'Save any section you built as your own component. Drop a copy into any page, then adapt it without changing the original.',
    detail: 'Save once · Reuse anywhere',
  },
  {
    icon: 'undo',
    title: 'Undo, redo and local autosave',
    body: "Experiment freely. Duplicate pages to explore a direction, undo what didn't work, and come back to work saved in your browser.",
    detail: 'Autosave in IndexedDB · Undo and redo',
  },
]

export const STEPS: Array<{ title: string; body: string }> = [
  {
    title: 'Start from a template',
    body: 'Pick a blank page or a Shopify App Home template: home, index, details, settings or empty state.',
  },
  {
    title: 'Build and validate',
    body: 'Drag in Polaris components, edit their properties in the inspector, and fix anything the checker flags.',
  },
  {
    title: 'Export React JSX or HTML',
    body: 'Download typed React JSX or plain HTML and paste it into your Shopify app.',
  },
]

export const FAQ: Array<{ id?: string; q: string; a: string }> = [
  {
    q: 'What is PlayPolaris?',
    a: "PlayPolaris is a free Shopify Polaris playground and UI builder. You arrange Shopify's real Polaris web components in a live preview, it checks Polaris nesting and slot rules as you go, and you export the screen as React JSX or HTML for your Shopify app.",
  },
  {
    q: 'Which Polaris components can I use?',
    a: 'All 62 Polaris web components for App Home: page, section, stack, grid and box for layout; text, number, money, date and color fields, selects, checkboxes and switches for forms; tables, badges, banners, modals, popovers, tooltips and more. The components page lists every one with a short example.',
  },
  {
    q: 'Is PlayPolaris a Storybook for Polaris?',
    a: "Shopify's own Polaris Storybook documents each component on its own. PlayPolaris is a playground for whole pages: compose Polaris components into a Shopify admin screen, validate the result, and export it as React JSX or HTML.",
  },
  {
    q: 'Does it support Polaris 2.0?',
    a: "Yes. Switch between Polaris web components v1 (polaris-1.js) and the Polaris 2.0 release candidate (polaris-2.0-rc.js), which previews the new Shopify admin design. The component catalog comes from Shopify's official @shopify/polaris-types packages.",
  },
  {
    q: 'Does it work with Polaris React?',
    a: "PlayPolaris builds with Polaris web components, the s-* elements Shopify recommends for new App Home interfaces, and exports React JSX that uses them with types from @shopify/polaris-types. It doesn't generate code for the older @shopify/polaris React package. Shopify's migration guide covers moving from Polaris React to web components.",
  },
  {
    q: 'Are there Shopify app UI templates?',
    a: 'Yes. Start a page from a home, index, details, settings or empty-state template built with Polaris web components. Export any of them as HTML or React JSX.',
  },
  {
    q: 'Is it free, and do I need an account?',
    a: "It's free, and there's no account or sign-up. Open the builder and start; your work is saved in your browser as you go.",
  },
  {
    q: 'Is PlayPolaris open source?',
    a: 'Yes. PlayPolaris is released under the MIT License. You can read the source code, report issues, and contribute on GitHub.',
  },
  {
    q: 'Where is my work stored?',
    a: "In your browser's IndexedDB storage. Shared sessions relay edits to other people in the room without keeping a server copy. Clearing this site's data removes your local copies, so export pages you want to keep.",
  },
  {
    id: 'sharing-faq',
    q: 'How do shared sessions work?',
    a: 'Start a shared session and send the link to a teammate. Anyone with that link can edit the shared copy, while your personal workspace stays separate. Each browser keeps a local copy; there is no permanent server copy. A new participant needs someone with a saved copy online to join. Export important work for backup.',
  },
  {
    q: 'Can I use the exported code in my Shopify app?',
    a: 'Yes. HTML export can include the Polaris and App Bridge script tags, and React export produces a component typed with @shopify/polaris-types. Both use the same s-* elements Shopify documents for App Home.',
  },
  {
    q: 'Does it check that my layout is valid?',
    a: "Yes. It checks allowed parents, what each slot accepts, property values, duplicate ids and basic accessibility, and it refuses drops Polaris doesn't allow, with the reason.",
  },
  {
    q: 'Can AI agents use it?',
    a: 'Yes, in browsers that support WebMCP. The builder exposes tools for reading the component catalog, creating and editing pages, validating and exporting, so an agent can build screens alongside you.',
  },
  {
    q: 'Does it build a complete Shopify app or storefront?',
    a: 'PlayPolaris builds interface prototypes for Shopify App Home, not storefront themes or a complete app backend. Exported HTML and React JSX give you the UI structure. Connect your own app logic, data, authentication, and Shopify APIs in your project.',
  },
  {
    q: 'Is this an official Shopify product?',
    a: "No. PlayPolaris is an independent tool. It loads Polaris from Shopify's CDN and follows Shopify's public documentation, but it isn't made or endorsed by Shopify.",
  },
]
