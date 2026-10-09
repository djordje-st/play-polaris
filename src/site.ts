import type { IconName } from './components/ui'

export const SITE = {
  name: 'PlayPolaris',
  url: 'https://playpolaris.dev',
  repository: 'https://github.com/djordje-st/play-polaris',
  title: 'Free Shopify Polaris UI Builder | PlayPolaris',
  description:
    'Build Shopify app UI with real Polaris web components. Drag and drop, preview, collaborate, and export HTML or React JSX. Free, open source, no signup.',
  summary:
    'A free, open-source visual builder for Shopify App Home interfaces. Build with real Polaris web components, validate layouts, collaborate in shared sessions, work with AI agents over WebMCP, and export HTML or React JSX.',
  updated: '2026-10-09',
} as const

export const FEATURES: Array<{
  icon: IconName
  title: string
  body: string
  detail: string
}> = [
  {
    icon: 'desktop',
    title: 'Real Polaris. Real preview.',
    body: "Build with Shopify's actual web components. Switch between Polaris v1 and v2 RC, and interact with your screen as you go.",
    detail: 'Shopify runtime · No lookalike components',
  },
  {
    icon: 'check',
    title: 'Guardrails that get it.',
    body: "Catch invalid nesting, misplaced slots, and accessibility gaps while you build. If something doesn't fit, the checker tells you why.",
    detail: 'Live validation · Clear explanations',
  },
  {
    icon: 'blocks',
    title: 'Less setup. More making.',
    body: 'Start with a home, index, details, settings, or empty-state layout. Drag from the palette, reorder layers, or add components in place.',
    detail: 'Starter layouts · Drag and drop',
  },
  {
    icon: 'mobile',
    title: 'See the smaller picture.',
    body: 'Switch the canvas between desktop, tablet, and mobile sizes. Check how your Shopify app layout adapts before you bring it into your project.',
    detail: 'Desktop · Tablet · Mobile',
  },
  {
    icon: 'component',
    title: 'Build once. Use it again.',
    body: 'Save a useful section as your own component. Drop a copy into any page, then adapt it without changing the original.',
    detail: 'Reusable components · Independent copies',
  },
  {
    icon: 'undo',
    title: 'Room to change your mind.',
    body: 'Experiment with undo and redo, duplicate pages to explore a direction, and come back to work saved automatically in your browser.',
    detail: 'Local autosave · Undo and redo',
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

export const FAQ: Array<{ id?: string; q: string; a: string }> = [
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
