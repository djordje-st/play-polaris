// Shopify publishes no runtime for checkout and customer account components:
// the host renders them. These stand-ins draw each one from its attributes so
// the preview follows the branding settings. They approximate the real look.

const SPACE: Record<string, string> = {
  none: '0',
  'small-500': '2px',
  'small-400': '3.5px',
  'small-300': '5px',
  'small-200': '7px',
  'small-100': '9px',
  small: '11px',
  base: '14px',
  large: '17px',
  'large-100': '19px',
  'large-200': '21px',
  'large-300': '24px',
  'large-400': '26px',
  'large-500': '28px',
}
const RADIUS: Record<string, string> = {
  none: '0',
  'small-100': 'var(--pg-r-small)',
  small: 'var(--pg-r-small)',
  base: 'var(--pg-r)',
  large: 'var(--pg-r-large)',
  'large-100': 'var(--pg-r-large)',
  max: '999px',
}
const BORDER: Record<string, string> = {
  none: '0',
  base: '1px',
  large: '2px',
  'large-100': '3px',
  'large-200': '4px',
}
const BACKGROUND: Record<string, string> = {
  base: 'var(--pg-bg)',
  subdued: 'var(--pg-subdued-bg)',
  transparent: 'transparent',
}

const scale = (map: Record<string, string>) => (v: string) =>
  v
    .split(/\s+/)
    .map(k => map[k] ?? k)
    .join(' ')
const raw = (v: string) => v
const size = (v: string) => (v === 'fill' ? '100%' : v)

const LAYOUT: Record<string, [string, (v: string) => string]> =
  Object.fromEntries(
    (
      [
        ['padding', 'padding', scale(SPACE)],
        ['paddingBlock', 'padding-block', scale(SPACE)],
        ['paddingBlockStart', 'padding-block-start', scale(SPACE)],
        ['paddingBlockEnd', 'padding-block-end', scale(SPACE)],
        ['paddingInline', 'padding-inline', scale(SPACE)],
        ['paddingInlineStart', 'padding-inline-start', scale(SPACE)],
        ['paddingInlineEnd', 'padding-inline-end', scale(SPACE)],
        ['gap', 'gap', scale(SPACE)],
        ['rowGap', 'row-gap', scale(SPACE)],
        ['columnGap', 'column-gap', scale(SPACE)],
        ['blockSize', 'block-size', size],
        ['inlineSize', 'inline-size', size],
        ['minBlockSize', 'min-block-size', raw],
        ['maxBlockSize', 'max-block-size', raw],
        ['minInlineSize', 'min-inline-size', raw],
        ['maxInlineSize', 'max-inline-size', raw],
        ['alignItems', 'align-items', raw],
        ['alignContent', 'align-content', raw],
        ['justifyContent', 'justify-content', raw],
        ['justifyItems', 'justify-items', raw],
        ['placeItems', 'place-items', raw],
        ['placeContent', 'place-content', raw],
        ['gridTemplateColumns', 'grid-template-columns', raw],
        ['gridTemplateRows', 'grid-template-rows', raw],
        ['gridAutoColumns', 'grid-auto-columns', raw],
        ['gridAutoRows', 'grid-auto-rows', raw],
        ['gridAutoFlow', 'grid-auto-flow', raw],
        ['gridColumn', 'grid-column', raw],
        ['gridRow', 'grid-row', raw],
        ['borderRadius', 'border-radius', scale(RADIUS)],
        ['borderWidth', 'border-width', scale(BORDER)],
        ['borderStyle', 'border-style', v => v.replaceAll('auto', 'solid')],
        [
          'border',
          'border',
          v => {
            const [width = 'none', , style = 'auto'] = v.split(/\s+/)

            return width === 'none'
              ? 'none'
              : `${BORDER[width] ?? '1px'} ${style === 'auto' ? 'solid' : style} var(--pg-border)`
          },
        ],
        ['background', 'background', v => BACKGROUND[v] ?? ''],
        ['overflow', 'overflow', raw],
        ['display', 'display', v => (v === 'none' ? 'none' : '')],
        ['textAlign', 'text-align', v => (v === 'auto' ? '' : v)],
        ['aspectRatio', 'aspect-ratio', raw],
        ['position', 'position', raw],
        ['insetBlock', 'inset-block', raw],
        ['insetInline', 'inset-inline', raw],
        ['transform', 'transform', raw],
      ] as Array<[string, string, (v: string) => string]>
    ).map(([attr, css, fn]) => [attr.toLowerCase(), [css, fn]])
  )

// shortcut: container-query values (`@container (…) a, b`) use their
// fallback; evaluate the conditions if responsive previews matter.
const plain = (v: string) =>
  v.startsWith('@container') ? v.slice(v.lastIndexOf(',') + 1).trim() : v

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!
  )
const get = (el: Element, name: string) => esc(el.getAttribute(name) ?? '')
const flag = (el: Element, name: string, html = name) =>
  el.hasAttribute(name) ? ` ${html}` : ''

const RING = 'M10 17.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15z'
const BOX = 'M3 6.5l7-3.5 7 3.5v7l-7 3.5-7-3.5zM3 6.5l7 3.5 7-3.5M10 10v7'
const TAG = 'M3.5 10.5v-7h7l6 6-7 7zM7 7v.01'
const PIN =
  'M10 17.5s-5.5-5-5.5-9a5.5 5.5 0 0 1 11 0c0 4-5.5 9-5.5 9zM10 8.5v.01'
const TILES =
  'M3.5 3.5h5v5h-5zM11.5 3.5h5v5h-5zM3.5 11.5h5v5h-5zM11.5 11.5h5v5h-5z'
const TRUCK =
  'M2.5 5.5h9v8h-9zM11.5 8.5h3.5l2.5 2.5v2.5h-6M6 15.5v.01M14 15.5v.01'
const STAR = 'M10 3l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L2.8 8.3l5-.7z'

// Line drawings on a 20px grid; `-filled` names reuse the outline.
const ICONS: Record<string, string> = {
  'alert-circle': `${RING}M10 6v5M10 13.5v.01`,
  'alert-triangle': 'M10 3l7.5 13.5h-15zM10 8v4M10 14v.01',
  'arrow-down': 'M10 4v12M5 11l5 5 5-5',
  'arrow-left': 'M16 10H4M9 5l-5 5 5 5',
  'arrow-right': 'M4 10h12M11 5l5 5-5 5',
  'arrow-up-right': 'M6 14l8-8M7 6h7v7',
  'arrow-up': 'M10 16V4M5 9l5-5 5 5',
  bag: 'M4.5 7h11l-1 10h-9zM7.5 7V5.5a2.5 2.5 0 0 1 5 0V7',
  bullet: 'M10 9.5v1',
  calendar: 'M3.5 5h13v11.5h-13zM3.5 8.5h13M7 3v3M13 3v3',
  camera:
    'M3 6.5h3l1.5-2h5l1.5 2h3V16H3zM10 13.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  'caret-down': 'M6 8l4 5 4-5z',
  cart: 'M2.5 3.5h2l2 9h8.5l1.5-6.5H5.5M8 16v.01M14 16v.01',
  'cash-dollar': `${RING}M12 7.5c-.5-.7-1.2-1-2-1-1.2 0-2 .7-2 1.6 0 2.2 4 1.2 4 3.5 0 .9-.9 1.6-2 1.6-.9 0-1.6-.4-2-1M10 5v1.5M10 13.5V15`,
  categories: TILES,
  'check-circle': `${RING}M6.5 10.5l2.5 2.5 4.5-5`,
  check: 'M4 10.5l4 4 8-9',
  'chevron-down': 'M5 8l5 5 5-5',
  'chevron-left': 'M12 5l-5 5 5 5',
  'chevron-right': 'M8 5l5 5-5 5',
  'chevron-up': 'M5 12l5-5 5 5',
  circle: RING,
  clipboard: 'M5 4.5h10V17H5zM7.5 3h5v3h-5z',
  clock: `${RING}M10 6v4l2.5 2`,
  'credit-card': 'M2.5 5h15v10h-15zM2.5 8.5h15M5.5 12h3',
  delete: 'M4 6h12M8 6V4h4v2M5.5 6l.8 10.5h7.4L14.5 6M8.5 9v5M11.5 9v5',
  delivered: `${BOX}`,
  delivery: TRUCK,
  disabled: `${RING}M5 5l10 10`,
  discount: TAG,
  edit: 'M4 16l1-4 8.5-8.5 3 3L8 15zM12 5l3 3',
  email: 'M3 5h14v10H3zM3 6l7 5 7-5',
  empty: '',
  external: 'M11 4h5v5M16 4l-7 7M14 11.5V16H4V6h4.5',
  filter: 'M3 5h14M6 10h8M8.5 15h3',
  geolocation: PIN,
  'gift-card':
    'M3 6.5h14v10H3zM3 10h14M10 6.5v10M10 6.5c-1-3-4.5-3-4 0M10 6.5c1-3 4.5-3 4 0',
  globe: `${RING}M3 10h14M10 3c2.5 2.5 2.5 11.5 0 14M10 3c-2.5 2.5-2.5 11.5 0 14`,
  grid: TILES,
  image: 'M3 4h14v12H3zM3 13l4-4 4 4 2.5-2.5L17 14M13 8v.01',
  info: `${RING}M10 9v5M10 6.5v.01`,
  'list-bulleted':
    'M7 5.5h10M7 10h10M7 14.5h10M3.5 5.5v.01M3.5 10v.01M3.5 14.5v.01',
  location: PIN,
  lock: 'M5 9h10v8H5zM7 9V6.5a3 3 0 0 1 6 0V9',
  map: 'M3 5.5l4.5-2 5 2 4.5-2v11l-4.5 2-5-2-4.5 2zM7.5 3.5v11M12.5 5.5v11',
  'menu-horizontal': 'M5 10v.01M10 10v.01M15 10v.01',
  'menu-vertical': 'M10 5v.01M10 10v.01M10 15v.01',
  menu: 'M3 5.5h14M3 10h14M3 14.5h14',
  minus: 'M4 10h12',
  mobile: 'M6.5 3h7v14h-7zM9.5 14.5h1',
  note: 'M5 3h7l3.5 3.5V17H5zM12 3v4h3.5M7.5 10h5M7.5 13h5',
  order: BOX,
  organization:
    'M4 17V4h8v13M12 8h4v9M2.5 17h15M7 7.5v.01M9.5 7.5v.01M7 10.5v.01M9.5 10.5v.01',
  plus: 'M10 4v12M4 10h12',
  profile:
    'M10 10a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM4 17c.5-3.5 3-5 6-5s5.5 1.5 6 5',
  'question-circle': `${RING}M8 8a2 2 0 1 1 3 1.7c-.6.4-1 .8-1 1.6M10 14v.01`,
  reorder: 'M4 7h12M4 13h12M13 4l3 3-3 3M7 10l-3 3 3 3',
  reset: 'M4 10a6 6 0 1 0 2-4.5M4 4v3.5h3.5',
  return: 'M4 8h8.5a3.5 3.5 0 0 1 0 7H8M7 5L4 8l3 3',
  savings: TAG,
  search: 'M9 14.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 13l4 4',
  settings:
    'M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4',
  'star-half': STAR,
  star: STAR,
  store:
    'M3.5 9.5v7h13v-7M2.5 8l1.5-4.5h12L17.5 8a2.5 2 0 0 1-5 0 2.5 2 0 0 1-5 0 2.5 2 0 0 1-5 0zM8 16.5v-4h4v4',
  truck: TRUCK,
  upload: 'M10 13V4M6 7.5l4-4 4 4M4 13v3.5h12V13',
  'x-circle': `${RING}M7.5 7.5l5 5M12.5 7.5l-5 5`,
  x: 'M5 5l10 10M15 5L5 15',
}

const icon = (type: string | null) => {
  const name = (type ?? '').replace(/-filled$/, '')

  return type
    ? `<svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><path d="${ICONS[name] ?? RING}"${type === 'star-filled' ? ' fill="currentColor"' : ''}/></svg>`
    : ''
}

type Render = (el: HTMLElement) => string

const field =
  (type: string, prefix = '', extra = ''): Render =>
  el => {
    const label = get(el, 'label')
    const error = get(el, 'error')
    const placeholder = get(el, 'placeholder')
    const value = get(el, 'value') || get(el, 'defaultValue')
    const state = `${flag(el, 'disabled')}${flag(el, 'readOnly', 'readonly')}`
    const control =
      type === 'textarea'
        ? `<textarea rows="${get(el, 'rows') || 2}" placeholder="${placeholder || ' '}"${state}>${value}</textarea>`
        : `<input type="${type}" placeholder="${placeholder || ' '}" value="${value}"${state}>`
    const before = prefix || get(el, 'prefix')
    const after = get(el, 'suffix')

    return `<label class="field${error ? ' bad' : ''}${placeholder || before ? ' ph' : ''}${el.getAttribute('labelAccessibilityVisibility') === 'exclusive' ? ' bare' : ''}"><span class="lo">${label}</span><span class="box">${before ? `<span class="fix">${before}</span>` : ''}${control}<span class="li">${label}</span>${after ? `<span class="fix">${after}</span>` : ''}${icon(el.getAttribute('icon'))}${extra}</span>${error ? `<span class="msg">${error}</span>` : ''}</label>`
  }

const check =
  (type: string, cls = ''): Render =>
  el =>
    `<label class="check ${cls}"><input type="${type}"${flag(el, 'checked')}${flag(el, 'defaultChecked', 'checked')}${flag(el, 'disabled')}><span>${get(el, 'label')}<slot></slot></span></label>${el.hasAttribute('error') ? `<span class="msg">${get(el, 'error')}</span>` : ''}`

const dialog =
  (cls: string): Render =>
  el =>
    `<div class="backdrop" data-close></div><div class="dialog ${cls} ${get(el, 'size')}" role="dialog"><header><h2>${get(el, 'heading')}</h2><button type="button" class="x" data-close aria-label="Close">${icon('x')}</button></header><div class="body${el.getAttribute('padding') === 'none' ? ' flush' : ''}"><slot></slot></div><footer><slot name="secondary-actions"></slot><slot name="primary-action"></slot></footer></div>`

const popover: Render = () =>
  '<div class="pop" popover="manual"><slot></slot></div>'

const media = (el: Element, fallback: string) =>
  el.getAttribute('src')
    ? `<img src="${get(el, 'src')}" alt="${get(el, 'alt')}">`
    : fallback

// A stand-in pattern, not a scannable code.
function qr(content: string) {
  let seed = [...content].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)
  let cells = ''
  const finder = (x: number, y: number) =>
    `M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5zM${x + 2} ${y + 2}h3v3h-3z`

  for (let y = 0; y < 21; y++) {
    for (let x = 0; x < 21; x++) {
      seed = (seed * 1103515245 + 12345) | 0

      const corner = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)

      if (!corner && seed & 0x10000) {
        cells += `M${x} ${y}h1v1h-1z`
      }
    }
  }

  return `<svg class="qr" viewBox="-1 -1 23 23" role="img" aria-label="QR code"><path fill-rule="evenodd" d="${finder(0, 0)}${finder(14, 0)}${finder(0, 14)}${cells}"/></svg>`
}

function calendar(value: string) {
  const picked = /^\d{4}-\d{2}-\d{2}/.test(value) ? new Date(value) : null
  const month = picked ?? new Date()
  const year = month.getUTCFullYear()
  const m = month.getUTCMonth()
  const offset = new Date(Date.UTC(year, m, 1)).getUTCDay()
  const days = new Date(Date.UTC(year, m + 1, 0)).getUTCDate()
  const title = month.toLocaleString('en', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const cells = Array.from({ length: offset + days }, (_, i) => {
    const day = i - offset + 1

    return day < 1
      ? '<span></span>'
      : `<span${picked?.getUTCDate() === day ? ' class="on"' : ''}>${day}</span>`
  })

  return `<div class="cal"><strong>${title}</strong><div>${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<b>${d}</b>`).join('')}${cells.join('')}</div></div>`
}

const SHADOW: Record<string, Render> = {
  's-announcement': () =>
    `<div class="bar"><span><slot></slot></span><button type="button" class="x" aria-label="Dismiss">${icon('x')}</button></div>`,
  's-avatar': el =>
    media(el, `<span>${get(el, 'initials') || icon('profile')}</span>`),
  's-badge': el => `${icon(el.getAttribute('icon'))}<slot></slot>`,
  's-banner': el => {
    const tone = el.getAttribute('tone') ?? 'auto'

    return `<div class="banner ${esc(tone)}">${icon(tone === 'success' ? 'check-circle' : tone === 'warning' || tone === 'critical' ? 'alert-triangle' : 'info')}<div><strong>${get(el, 'heading')}</strong><slot></slot></div>${el.hasAttribute('dismissible') ? `<button type="button" class="x" aria-label="Dismiss">${icon('x')}</button>` : ''}</div>`
  },
  's-checkbox': check('checkbox'),
  's-consent-checkbox': check('checkbox'),
  's-switch': check('checkbox', 'switch'),
  's-choice': el => {
    const list = el.closest('s-choice-list')

    return `<label class="check"><input type="${list?.hasAttribute('multiple') ? 'checkbox' : 'radio'}"${flag(el, 'selected', 'checked')}${flag(el, 'defaultSelected', 'checked')}${flag(el, 'disabled')}><span><slot></slot><slot name="secondaryContent"></slot></span></label><slot name="details"></slot><slot name="selectedContent"></slot>`
  },
  's-choice-list': el =>
    `<fieldset class="choices ${get(el, 'variant')}"><legend>${get(el, 'label')}</legend><slot></slot></fieldset>${el.hasAttribute('error') ? `<span class="msg">${get(el, 'error')}</span>` : ''}`,
  's-consent-phone-field': field('tel'),
  's-customer-account-action': el =>
    `<div class="dialog inline"><header><h2>${get(el, 'heading')}</h2></header><div class="body"><slot></slot></div><footer><slot name="secondary-actions"></slot><slot name="primary-action"></slot></footer></div>`,
  's-date-field': field('text', '', icon('calendar')),
  's-date-picker': el => calendar(el.getAttribute('value') ?? ''),
  's-details': el =>
    `<details${flag(el, 'open')}${flag(el, 'defaultOpen', 'open')}><summary><slot name="summary"></slot>${icon('chevron-down')}</summary><slot></slot></details>`,
  's-drop-zone': el =>
    `<div class="drop">${icon('upload')}<span>${get(el, 'label') || 'Add file'}</span></div>${el.hasAttribute('error') ? `<span class="msg">${get(el, 'error')}</span>` : ''}`,
  's-email-field': field('email'),
  's-icon': el => icon(el.getAttribute('type') || 'circle'),
  's-image': el =>
    `<img src="${get(el, 'src')}" alt="${get(el, 'alt')}" style="object-fit:${el.getAttribute('objectFit') === 'cover' ? 'cover' : 'contain'}">`,
  's-map': () =>
    `<div class="map">${icon('location')}<span>Map preview</span><slot></slot></div>`,
  's-menu': popover,
  's-modal': dialog(''),
  's-money-field': field('text', '$'),
  's-number-field': field('number'),
  's-page': el =>
    `<div class="page ${get(el, 'inlineSize')}"><slot name="breadcrumb-actions"></slot><header><div><h1>${get(el, 'heading')}</h1><p>${get(el, 'subheading')}</p></div><div class="actions"><slot name="secondary-actions"></slot><slot name="primary-action"></slot></div></header><div class="content"><slot></slot></div></div>`,
  's-password-field': field('password'),
  // shortcut: every brand draws the same labelled chip; add artwork per
  // payment type if the icons need to be recognizable.
  's-payment-icon': el =>
    `<span class="pay">${get(el, 'type') || 'card'}</span>`,
  's-phone-field': field('tel'),
  's-popover': popover,
  's-product-thumbnail': el =>
    `${media(el, icon('image'))}${el.getAttribute('totalItems') ? `<b>${get(el, 'totalItems')}</b>` : ''}`,
  's-progress': el =>
    `<progress class="${get(el, 'tone')}"${el.hasAttribute('value') ? ` value="${get(el, 'value')}"` : ''} max="${get(el, 'max') || 1}"></progress>`,
  's-qr-code': el => qr(el.getAttribute('content') ?? ''),
  's-section': el =>
    `${el.getAttribute('heading') ? `<h2>${get(el, 'heading')}</h2>` : ''}<slot></slot><div class="actions"><slot name="secondary-actions"></slot><slot name="primary-action"></slot></div>`,
  's-select': el => {
    const options = [...el.querySelectorAll('s-option')].map(
      o =>
        `<option value="${get(o, 'value')}"${flag(o, 'selected')}${flag(o, 'defaultSelected', 'selected')}${flag(o, 'disabled')}${o.getAttribute('value') === el.getAttribute('value') ? ' selected' : ''}>${esc(o.textContent)}</option>`
    )
    const error = get(el, 'error')

    return `<label class="field ph${error ? ' bad' : ''}"><span class="lo">${get(el, 'label')}</span><span class="box"><select${flag(el, 'disabled')}>${el.hasAttribute('placeholder') ? `<option value="">${get(el, 'placeholder')}</option>` : ''}${options.join('')}</select><span class="li">${get(el, 'label')}</span>${icon('chevron-down')}</span>${error ? `<span class="msg">${error}</span>` : ''}</label>`
  },
  's-sheet': dialog('sheet'),
  's-text-area': field('textarea'),
  's-text-field': field('text'),
  's-tooltip': popover,
  's-url-field': field('url'),
}

/** Component chrome drawn inside shadow roots. */
const SHADOW_CSS = `
*, *::before, *::after { box-sizing: border-box; }
.icon { width: 1.3em; height: 1.3em; flex: none; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
h1, h2, p { margin: 0; }
h1 { font: 600 var(--pg-fs-xxl)/1.2 var(--pg-heading-font); text-transform: none; }
h2 { font: 600 var(--pg-fs-xl)/1.3 var(--pg-heading-font); }
h2:empty, p:empty, strong:empty, legend:empty { display: none; }
button.x { all: unset; display: grid; place-items: center; padding: 2px; border-radius: var(--pg-r-small); cursor: pointer; color: inherit; opacity: .7; }
button.x:hover { opacity: 1; }
.msg { display: block; margin-top: 4px; font-size: var(--pg-fs-small); color: var(--pg-critical); }

.field { display: block; }
.lo { display: block; overflow: hidden; block-size: calc(var(--pg-label-outside) * 1.7em); font-size: var(--pg-fs); }
.bare .lo, .bare .li { display: none; }
.box { position: relative; display: flex; align-items: center; gap: 6px; min-block-size: 3.5em; padding-inline: 11px;
  border: var(--pg-control-border) solid var(--pg-control-line); border-radius: var(--pg-r); background: var(--pg-control-bg); color: var(--pg-text); }
.box:focus-within { outline: 2px solid var(--pg-accent); outline-offset: -1px; }
.bad .box { border-color: var(--pg-critical); outline: 1px solid var(--pg-critical); outline-offset: -2px; }
.box .icon, .fix { color: var(--pg-subdued); }
.fix { padding-block-start: calc((1 - var(--pg-label-outside)) * 1.1em); }
input:not([type=checkbox], [type=radio]), textarea, select { all: unset; flex: 1; min-inline-size: 0; align-self: stretch; font: inherit; color: inherit;
  padding-block: calc((1 - var(--pg-label-outside)) * 1.5em + var(--pg-label-outside) * .9em) calc((1 - var(--pg-label-outside)) * .4em + var(--pg-label-outside) * .9em); }
.bare input, .bare textarea { padding-block: .9em; }
textarea { white-space: pre-wrap; overflow-wrap: anywhere; resize: vertical; }
input::placeholder, textarea::placeholder { color: var(--pg-subdued); }
input:disabled, select:disabled, textarea:disabled { opacity: .5; }
.li { position: absolute; inset-inline-start: 11px; inset-block-start: 50%; translate: 0 -50%; pointer-events: none; color: var(--pg-subdued);
  opacity: calc(1 - var(--pg-label-outside)); transition: all .12s ease-out; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-inline-size: calc(100% - 22px); }
textarea ~ .li { inset-block-start: 1.75em; }
.ph .li, :is(input, textarea):not(:placeholder-shown) ~ .li, :is(input, textarea):focus ~ .li { inset-block-start: .65em; translate: none; font-size: var(--pg-fs-small); }

.check { display: flex; gap: 10px; align-items: flex-start; cursor: pointer; line-height: 1.4; }
.check > span { flex: 1; min-inline-size: 0; }
input[type=checkbox], input[type=radio] { appearance: none; flex: none; inline-size: 20px; block-size: 20px; margin: 0; border-radius: var(--pg-r-small);
  background: var(--pg-control-bg) center / 12px no-repeat; box-shadow: inset 0 0 0 1px var(--pg-control-line); transition: box-shadow .12s; cursor: pointer; }
input[type=checkbox]:checked { background-color: var(--pg-accent); box-shadow: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2 6.5l2.6 2.6L10 3.6' fill='none' stroke='%23fff' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); }
input[type=radio] { inline-size: 18px; block-size: 18px; border-radius: 50%; }
input[type=radio]:checked { box-shadow: inset 0 0 0 6px var(--pg-accent); }
.switch input { inline-size: 36px; border-radius: 99px; background: var(--pg-control-line); box-shadow: none; position: relative; transition: background .12s; }
.switch input::after { content: ''; position: absolute; inset: 2px auto 2px 2px; inline-size: 16px; border-radius: 50%; background: #fff; transition: translate .12s; }
.switch input:checked { background: var(--pg-accent); box-shadow: none; }
.switch input:checked::after { translate: 16px; }
fieldset { all: unset; display: flex; flex-direction: column; gap: 11px; }
fieldset.inline { flex-direction: row; flex-wrap: wrap; gap: 17px; }
fieldset.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
legend { padding: 0 0 4px; font-weight: 600; }

.banner { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border: 1px solid color-mix(in srgb, var(--tone) 35%, transparent);
  border-radius: var(--pg-r); background: color-mix(in srgb, var(--tone) 8%, var(--pg-bg)); --tone: var(--pg-accent); }
.banner > .icon { color: var(--tone); margin-top: 1px; }
.banner > div { flex: 1; min-inline-size: 0; display: flex; flex-direction: column; gap: 4px; line-height: 1.45; }
.banner.success { --tone: var(--pg-success); }
.banner.warning { --tone: var(--pg-warning); }
.banner.critical { --tone: var(--pg-critical); }
.bar { display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: var(--pg-subdued-bg); border-block-end: 1px solid var(--pg-border); }
.bar > span { flex: 1; text-align: center; }

details > summary { list-style: none; display: flex; align-items: center; justify-content: space-between; gap: 8px; cursor: pointer; }
details > summary::-webkit-details-marker { display: none; }
details[open] > summary { margin-block-end: 9px; }
details[open] > summary .icon { rotate: 180deg; }
.drop { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; min-block-size: 96px; padding: 14px;
  border: 1px dashed var(--pg-control-line); border-radius: var(--pg-r); color: var(--pg-accent); }
.map { position: relative; display: grid; place-content: center; justify-items: center; gap: 4px; block-size: 100%; min-block-size: 180px; color: var(--pg-subdued);
  border-radius: var(--pg-r); background: repeating-linear-gradient(0deg, transparent 0 39px, rgb(0 0 0 / .05) 39px 40px), repeating-linear-gradient(90deg, transparent 0 39px, rgb(0 0 0 / .05) 39px 40px), #e8eef1; }
.pay { display: inline-grid; place-items: center; inline-size: 38px; block-size: 24px; overflow: hidden; border: 1px solid var(--pg-border); border-radius: 3px;
  background: #fff; color: #333; font: 600 8px/1 system-ui, sans-serif; text-transform: uppercase; }
progress { display: block; inline-size: 100%; block-size: 6px; accent-color: var(--pg-accent); }
progress.critical { accent-color: var(--pg-critical); }
.qr { display: block; inline-size: 100%; fill: #000; background: #fff; }
.cal { display: inline-block; padding: 12px; border: 1px solid var(--pg-border); border-radius: var(--pg-r); }
.cal > div { display: grid; grid-template-columns: repeat(7, 2.3em); margin-block-start: 8px; text-align: center; line-height: 2.3em; }
.cal b { font-weight: 400; color: var(--pg-subdued); }
.cal .on { border-radius: 50%; background: var(--pg-accent); color: var(--pg-on-button); }
img { display: block; inline-size: 100%; block-size: 100%; border-radius: inherit; object-fit: cover; }
:host(s-product-thumbnail) img { position: absolute; inset: 0; box-sizing: border-box; border: 2px solid var(--pg-bg); }
:host(s-product-thumbnail) b { position: absolute; inset: -6px -6px auto auto; box-sizing: border-box; min-inline-size: 20px; padding: 0 5px; border-radius: 10px;
  background: var(--pg-text); color: var(--pg-bg); font: 600 12px/20px var(--pg-font); text-align: center; }

.backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / .45); }
.dialog { position: fixed; inset: 50% auto auto 50%; translate: -50% -50%; display: flex; flex-direction: column; inline-size: min(560px, calc(100vw - 32px));
  max-block-size: calc(100vh - 48px); border-radius: var(--pg-r-large); background: var(--pg-bg); color: var(--pg-text); box-shadow: 0 16px 48px rgb(0 0 0 / .25); }
.dialog.small, .dialog.small-100 { inline-size: min(400px, calc(100vw - 32px)); }
.dialog.large, .dialog.large-100, .dialog.max { inline-size: min(820px, calc(100vw - 32px)); }
.dialog.sheet { inset: auto 0 0 0; translate: none; inline-size: auto; border-radius: var(--pg-r-large) var(--pg-r-large) 0 0; }
.dialog.inline { position: static; translate: none; inline-size: auto; max-block-size: none; box-shadow: none; }
.dialog > header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 20px; border-block-end: 1px solid var(--pg-border); }
.dialog > .body { padding: 20px; overflow: auto; }
.dialog > .body.flush { padding: 0; }
.dialog > footer, .actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px; }
.dialog > footer { padding: 14px 20px; border-block-start: 1px solid var(--pg-border); }
.pop { margin: 0; inset: auto; padding: 12px; max-inline-size: 320px; border: 1px solid var(--pg-border); border-radius: var(--pg-r); background: var(--pg-bg);
  color: var(--pg-text); font: var(--pg-fs)/1.45 var(--pg-font); box-shadow: 0 6px 20px rgb(0 0 0 / .14); }

.page { margin-inline: auto; max-inline-size: 1000px; }
.page.large { max-inline-size: 1280px; }
.page > header { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 12px; margin-block: 6px 21px; }
.page p { margin-block-start: 4px; color: var(--pg-subdued); }
.page .content { display: flex; flex-direction: column; gap: 17px; }
`

/** Host boxes; these sit in the document so the mock screens can use them too. */
export const ELEMENTS_CSS = `
:is(s-abbreviation, s-badge, s-button, s-chip, s-clickable, s-clickable-chip, s-icon, s-link, s-payment-icon, s-press-button, s-spinner, s-text, s-time) { box-sizing: border-box; }
:is(s-announcement, s-banner, s-box, s-choice, s-choice-list, s-checkbox, s-consent-checkbox, s-consent-phone-field, s-customer-account-action, s-date-field,
  s-details, s-divider, s-drop-zone, s-email-field, s-form, s-grid-item, s-heading, s-image, s-map, s-money-field, s-number-field, s-ordered-list, s-page, s-paragraph,
  s-password-field, s-phone-field, s-progress, s-query-container, s-scroll-box, s-section, s-select, s-skeleton-paragraph, s-summary, s-switch, s-text-area,
  s-text-field, s-unordered-list, s-url-field) { display: block; box-sizing: border-box; min-inline-size: 0; }
:is(s-clipboard-item, s-option, s-map-marker), :is(s-banner, s-clickable-chip)[hidden] { display: none; }
s-stack { display: flex; flex-direction: column; box-sizing: border-box; min-inline-size: 0; }
s-stack[direction=inline] { flex-direction: row; flex-wrap: wrap; align-content: flex-start; }
s-grid { display: grid; box-sizing: border-box; min-inline-size: 0; }
s-scroll-box { overflow: auto; }
s-query-container { container-type: inline-size; }
s-heading { margin: 0; font: 600 var(--pg-fs-large)/1.3 var(--pg-heading-font); }
s-page > s-heading, s-section s-section s-heading { font-size: var(--pg-fs); }
s-paragraph { line-height: 1.5; }
:is(s-text, s-paragraph)[type=small] { font-size: var(--pg-fs-small); }
s-text[type=strong] { font-weight: 600; }
s-text[type=emphasis] { font-style: italic; }
s-text[type=redundant] { text-decoration: line-through; }
s-text[type=mark] { background: color-mix(in srgb, var(--pg-warning) 25%, transparent); }
s-text[type=offset] { padding: 0 4px; border-radius: 3px; background: var(--pg-subdued-bg); font-family: ui-monospace, monospace; }
s-text[type=address] { display: block; white-space: pre-line; }
:is(s-text, s-paragraph)[color=subdued] { color: var(--pg-subdued); }
:is(s-text, s-paragraph, s-icon)[tone=info] { color: var(--pg-accent); }
:is(s-text, s-paragraph, s-icon)[tone=success] { color: var(--pg-success); }
:is(s-text, s-paragraph, s-icon)[tone=warning] { color: var(--pg-warning); }
:is(s-text, s-paragraph, s-icon)[tone=critical] { color: var(--pg-critical); }
s-abbreviation { text-decoration: underline dotted; cursor: help; }
s-link { color: var(--pg-accent); text-decoration: underline; cursor: pointer; }
s-link[tone=neutral] { color: inherit; }
s-clickable { display: block; cursor: pointer; }
s-divider { border-block-start: 1px solid var(--pg-border); }
s-divider[direction=block] { border-block-start: 0; border-inline-start: 1px solid var(--pg-border); align-self: stretch; min-block-size: 1em; }
s-ordered-list, s-unordered-list { padding-inline-start: 1.4em; line-height: 1.5; }
s-list-item { display: list-item; }
s-ordered-list > s-list-item { list-style: decimal; }
s-unordered-list > s-list-item { list-style: disc; }
s-summary { font-weight: 600; }

:is(s-button, s-press-button) { display: inline-flex; align-items: center; justify-content: center; gap: 8px; box-sizing: border-box; min-block-size: 50px; padding: .6em 1.2em;
  border: 1px solid var(--pg-button); border-radius: var(--pg-r); background: var(--pg-button); color: var(--pg-on-button);
  font-weight: 600; text-align: center; text-transform: var(--pg-button-case); cursor: pointer; user-select: none; }
:is(s-button, s-press-button):hover { filter: brightness(.94); }
:is(s-button[variant=secondary], s-button[slot=secondary-actions]:not([variant=primary]), s-press-button) { background: transparent; color: var(--pg-accent); border-color: var(--pg-control-line); text-transform: none; }
s-button[tone=critical] { background: var(--pg-critical); border-color: var(--pg-critical); color: #fff; }
s-button[variant=secondary][tone=critical] { background: transparent; color: var(--pg-critical); }
s-press-button:is([pressed], [defaultPressed]) { background: color-mix(in srgb, var(--pg-accent) 10%, transparent); border-color: var(--pg-accent); }
:is(s-button, s-press-button, s-clickable, s-clickable-chip)[disabled] { opacity: .5; pointer-events: none; }
:is(s-button, s-press-button, s-clickable)[loading] { position: relative; color: transparent; }
:is(s-button, s-press-button, s-clickable)[loading]::after, s-spinner { content: ''; display: inline-block; inline-size: 1.4em; block-size: 1.4em;
  border: 2px solid color-mix(in srgb, var(--pg-accent) 25%, transparent); border-block-start-color: var(--pg-accent); border-radius: 50%; animation: pg-spin .8s linear infinite; }
:is(s-button, s-press-button, s-clickable)[loading]::after { position: absolute; inset: 0; margin: auto; border-color: color-mix(in srgb, var(--pg-on-button) 35%, transparent); border-block-start-color: var(--pg-on-button); }
s-spinner:is([size=small], [size=small-100]) { inline-size: 1em; block-size: 1em; }
s-spinner:is([size=large], [size=large-100]) { inline-size: 2.4em; block-size: 2.4em; border-width: 3px; }
@keyframes pg-spin { to { rotate: 360deg; } }
s-button-group { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px; }
s-button-group > [slot=primary-action] { order: 1; }

:is(s-badge, s-chip, s-clickable-chip) { display: inline-flex; align-items: center; gap: 4px; padding: .15em .7em; border-radius: var(--pg-r-large);
  background: var(--pg-subdued-bg); font-size: var(--pg-fs-small); line-height: 1.5; white-space: nowrap; }
s-badge[tone=critical] { background: color-mix(in srgb, var(--pg-critical) 12%, var(--pg-bg)); color: var(--pg-critical); }
s-badge[color=subdued] { color: var(--pg-subdued); }
s-badge[size=small-100] { padding-inline: .5em; font-size: .78em; }
:is(s-chip, s-clickable-chip) { border: 1px solid var(--pg-border); background: transparent; }
s-clickable-chip { cursor: pointer; }
s-clickable-chip[removable]::after { content: '×'; margin-inline-start: 2px; font-size: 1.2em; line-height: 1; }

s-icon { display: inline-flex; vertical-align: middle; font-size: var(--pg-fs); }
s-icon:is([size=small], [size=small-100], [size=small-200]) { font-size: calc(var(--pg-fs) * .78); }
s-icon:is([size=large], [size=large-100]) { font-size: calc(var(--pg-fs) * 1.4); }
s-image { overflow: hidden; max-inline-size: 100%; }
s-image:not([inlineSize=fill]) { inline-size: fit-content; }
s-image-group { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; inline-size: 64px; aspect-ratio: 1; overflow: hidden; border: 1px solid var(--pg-border); border-radius: var(--pg-r); }
s-image-group > s-image:only-child { grid-column: span 2; }
s-image-group > s-image { inline-size: auto; }
:is(s-product-thumbnail, s-avatar) { position: relative; display: inline-grid; place-items: center; flex: none; inline-size: 64px; aspect-ratio: 1;
  border-radius: var(--pg-r-large); background: color-mix(in srgb, var(--pg-text) 7%, var(--pg-bg)); color: var(--pg-subdued); box-shadow: var(--pg-card-shadow); }
s-product-thumbnail[size=small] { inline-size: 48px; }
s-product-thumbnail[size=small-100] { inline-size: 36px; }
s-avatar { inline-size: 40px; border-radius: 50%; overflow: hidden; font-weight: 600; }
s-avatar:is([size=small], [size=small-200]) { inline-size: 28px; font-size: var(--pg-fs-small); }
s-avatar:is([size=large], [size=large-200]) { inline-size: 56px; font-size: var(--pg-fs-large); }
s-qr-code { display: inline-block; inline-size: 128px; padding: 6px; background: #fff; }
s-qr-code[size=fill] { display: block; inline-size: 100%; }
s-payment-icon { display: inline-flex; vertical-align: middle; }
s-skeleton-paragraph { min-block-size: 3.6em; border-radius: var(--pg-r-small);
  background: repeating-linear-gradient(var(--pg-subdued-bg) 0 .8em, transparent .8em 1.4em); }
s-section { display: flex; flex-direction: column; gap: 14px; }
html[data-surface=customer-account] s-section:not([padding=none]) { padding: 16px; }
html[data-surface=customer-account] s-section { border-radius: var(--pg-r-large); background: var(--pg-bg);
  box-shadow: var(--pg-card-shadow), 0 0 0 1px color-mix(in srgb, var(--pg-border) 60%, transparent); }
/* Customer accounts use quieter, more compact buttons than checkout. */
html[data-surface=customer-account] :is(s-button, s-press-button) { min-block-size: 40px; padding: .4em 1em; }
html[data-surface=customer-account] :is(s-button[variant=secondary], s-button[slot=secondary-actions]:not([variant=primary]), s-press-button) { color: var(--pg-text);
  border-color: transparent; box-shadow: var(--pg-card-shadow), 0 0 0 1px color-mix(in srgb, var(--pg-border) 60%, transparent); }
:is(s-modal, s-sheet) { display: none; }
:is(s-modal, s-sheet)[data-open] { display: block; position: fixed; inset: 0; z-index: 1000; }
:is(s-popover, s-tooltip, s-menu) { display: contents; }
s-menu s-button { display: flex; justify-content: flex-start; min-block-size: 0; padding: .55em .7em; border: 0; background: transparent; color: var(--pg-text); font-weight: 400; text-transform: none; }
s-menu s-button:hover { background: var(--pg-subdued-bg); filter: none; }
`

const OVERLAYS = 's-modal, s-sheet, s-popover, s-tooltip, s-menu'

type Overlay = HTMLElement & {
  showOverlay: (anchor?: Element | null) => void
  hideOverlay: () => void
}

/** Registers the stand-ins in the preview frame, for every tag in `tags`. */
export function installElements(
  win: Window & typeof globalThis,
  tags: Array<string>,
  attrs: Array<string>
) {
  const doc = win.document
  const sheet = new win.CSSStyleSheet()

  sheet.replaceSync(SHADOW_CSS)

  class Base extends win.HTMLElement {
    static observedAttributes = attrs.map(a => a.toLowerCase())

    private html?: string

    connectedCallback() {
      if (this.localName === 's-summary') {
        this.slot = 'summary'
      }

      // Selects and choices draw from their children, which arrive later.
      if (this.localName === 's-select' || this.localName === 's-choice') {
        new win.MutationObserver(() => this.update()).observe(
          this.localName === 's-select' ? this : (this.parentElement ?? this),
          {
            attributes: true,
            childList: true,
            subtree: true,
            characterData: true,
          }
        )
      }

      this.update()
    }

    attributeChangedCallback() {
      if (this.isConnected) {
        this.update()
      }
    }

    update() {
      const css: Array<string> = []

      for (const { name, value } of this.attributes) {
        const rule = LAYOUT[name]
        const out = rule?.[1](plain(value))

        if (rule && out) {
          css.push(`${rule[0]}:${out.replace(/[;{}]/g, '')}`)
        }
      }

      const style = css.join(';')

      if (
        this.getAttribute('style') !== style &&
        (style || this.style.length)
      ) {
        this.setAttribute('style', style)
      }

      const html = SHADOW[this.localName]?.(this)

      if (html !== undefined && html !== this.html) {
        const root = this.shadowRoot ?? this.attachShadow({ mode: 'open' })

        root.adoptedStyleSheets = [sheet]
        root.innerHTML = this.html = html

        if (this.localName === 's-choice') {
          // Radios in separate shadow roots don't form a group on their own.
          root.querySelector('input')!.onchange = e => {
            if ((e.target as HTMLInputElement).type !== 'radio') {
              return
            }

            for (const other of this.parentElement!.querySelectorAll(
              's-choice'
            )) {
              const input = other.shadowRoot?.querySelector('input')

              if (input && (other as Element) !== this) {
                input.checked = false
              }
            }
          }
        }
      }
    }

    showOverlay(anchor?: Element | null) {
      const pop = this.shadowRoot?.querySelector<HTMLElement>('[popover]')

      if (!pop) {
        return this.setAttribute('data-open', '')
      }

      const r = anchor?.getBoundingClientRect()

      pop.style.inset = r
        ? `${r.bottom + 6}px auto auto ${Math.max(8, Math.min(r.left, win.innerWidth - 336))}px`
        : '50% auto auto 50%'
      pop.showPopover()
    }

    hideOverlay() {
      const pop = this.shadowRoot?.querySelector<HTMLElement>('[popover]')

      if (pop?.matches(':popover-open')) {
        pop.hidePopover()
      }

      this.removeAttribute('data-open')
    }

    get shown() {
      return (
        this.hasAttribute('data-open') ||
        !!this.shadowRoot?.querySelector(':popover-open')
      )
    }
  }

  for (const tag of tags) {
    if (!win.customElements.get(tag)) {
      win.customElements.define(tag, class extends Base {})
    }
  }

  // Events also pass through the document and window, which aren't elements.
  type Node = Partial<Element>

  const target = (e: Event, attr: string) => {
    const trigger = (e.target as Node).closest?.(`[${attr}]`)
    const el = trigger && doc.getElementById(trigger.getAttribute(attr)!)

    return trigger && el?.matches(OVERLAYS)
      ? { trigger, el: el as Overlay & { shown: boolean } }
      : null
  }

  doc.addEventListener('click', e => {
    const close = e
      .composedPath()
      .some(n => (n as Node).hasAttribute?.('data-close'))
    const hit = target(e, 'commandfor')

    if (close) {
      ;(
        (e.composedPath().find(n => (n as Node).matches?.(OVERLAYS)) ??
          (e.target as Element)) as Partial<Overlay>
      ).hideOverlay?.()
    }

    // Clicking elsewhere dismisses menus and popovers, as the host would.
    if (e.isTrusted) {
      for (const open of doc.querySelectorAll<Overlay>(
        's-popover, s-menu, s-tooltip'
      )) {
        if (open !== hit?.el && !e.composedPath().includes(open)) {
          open.hideOverlay()
        }
      }
    }

    if (!hit) {
      return
    }

    const command = hit.trigger.getAttribute('command') ?? '--auto'

    if (command === '--hide' || (command !== '--show' && hit.el.shown)) {
      hit.el.hideOverlay()
    } else {
      hit.el.showOverlay(hit.trigger)
    }
  })
  doc.addEventListener('mouseover', e => {
    const hit = target(e, 'interestfor')

    hit?.el.showOverlay(hit.trigger)
  })
  doc.addEventListener('mouseout', e =>
    target(e, 'interestfor')?.el.hideOverlay()
  )
}
