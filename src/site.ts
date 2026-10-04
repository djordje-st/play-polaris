import type { IconName } from './components/ui'

export const SITE = {
  name: 'PlayPolaris',
  url: 'https://playpolaris.dev',
  repository: 'https://github.com/djordje-st/play-polaris',
  title: 'PlayPolaris: Shopify Polaris web components builder',
  description:
    'Free, open-source Shopify Polaris web components builder. Prototype App Home screens, check nesting rules, and export HTML or React JSX. No account needed.',
  summary:
    'A free, open-source, browser-based builder for prototyping Shopify App Home screens with Polaris web components, with live validation and HTML or React export.',
  updated: '2026-10-03',
} as const

export const FEATURES: Array<{ icon: IconName; title: string; body: string }> =
  [
    {
      icon: 'desktop',
      title: 'The real Polaris runtime',
      body: "Screens render with Shopify's own Polaris scripts. Switch between v1 and the 2.0 release candidate to see both admin designs.",
    },
    {
      icon: 'check',
      title: 'Nesting rules, checked live',
      body: "Every drop and edit is checked against Polaris slot and nesting rules, with a plain explanation when something doesn't fit.",
    },
    {
      icon: 'blocks',
      title: 'Drag, drop or add in place',
      body: 'Drag from the palette, reorder in the layers tree, or add a component between any two elements.',
    },
    {
      icon: 'code',
      title: 'HTML or React export',
      body: 'Copy or download clean markup for one page or all of them, as HTML or React JSX typed with @shopify/polaris-types.',
    },
    {
      icon: 'component',
      title: 'Your own components',
      body: 'Save anything you build as a reusable component, then drop it into any page.',
    },
    {
      icon: 'sparkle',
      title: 'Ready for AI agents',
      body: 'In browsers with WebMCP, AI agents can read the catalog, build pages and export code. Every change lands in your undo history.',
    },
  ]

export const STEPS: Array<{ title: string; body: string }> = [
  {
    title: 'Start from a layout',
    body: 'Pick a blank page or a common App Home layout: home, index, details, settings or empty state.',
  },
  {
    title: 'Build and check',
    body: 'Add components, edit their properties in the inspector, and fix anything the checker flags.',
  },
  {
    title: 'Export the code',
    body: 'Download HTML or React JSX and paste it into your Shopify app.',
  },
]

export const FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'What is PlayPolaris?',
    a: 'PlayPolaris is a free, browser-based builder for prototyping Shopify App Home screens with Polaris web components. You arrange real components in a live preview, it checks Polaris nesting rules as you go, and you export the result as HTML or React JSX.',
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
    q: 'Which Polaris versions does it support?',
    a: "Polaris web components v1 (polaris-1.js) and the 2.0 release candidate (polaris-2.0-rc.js), which shows the new Shopify admin design. You can switch at any time. The component catalog comes from Shopify's official @shopify/polaris-types packages.",
  },
  {
    q: 'Where is my work stored?',
    a: "In your browser's IndexedDB storage. Shared sessions relay edits to other people in the room without keeping a server copy. Clearing this site's data removes your local copies, so export pages you want to keep.",
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
    q: 'Is this an official Shopify product?',
    a: "No. PlayPolaris is an independent tool. It loads Polaris from Shopify's CDN and follows Shopify's public documentation, but it isn't made or endorsed by Shopify.",
  },
]
