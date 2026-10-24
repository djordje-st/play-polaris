import type { ExportOptions } from './codegen.ts'

export const componentName = (pageName: string) => {
  const words = pageName
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)

  const base =
    words.map(x => x.charAt(0).toUpperCase() + x.slice(1)).join('') ||
    'Untitled'

  if (/^\d/.test(base)) {
    return `Page${base}`
  }

  return base.endsWith('Page') ? base : `${base}Page`
}

export const slug = (name: string, fallback = 'page') =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || fallback

export const fileName = (pageName: string, opts: ExportOptions) =>
  `${slug(pageName)}.${opts.format === 'html' ? 'html' : opts.typescript ? 'tsx' : 'jsx'}`
