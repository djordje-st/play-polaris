import {
  For,
  Show,
  createEffect,
  createUniqueId,
  onCleanup,
  splitProps,
} from 'solid-js'
import { isServer } from 'solid-js/web'
import type { JSX, ParentProps } from 'solid-js'

export const PATHS = {
  chevronRight: 'M6 4l4 4-4 4',
  chevronDown: 'M4 6l4 4 4-4',
  plus: 'M8 3v10M3 8h10',
  x: 'M4 4l8 8M12 4l-8 8',
  more: 'M3.5 8h.01M8 8h.01M12.5 8h.01',
  undo: 'M5.5 3.5L2.5 6.5l3 3M2.5 6.5h7a3.5 3.5 0 010 7H7',
  redo: 'M10.5 3.5l3 3-3 3M13.5 6.5h-7a3.5 3.5 0 000 7H9',
  desktop: 'M2 3.5h12v8H2zM6 14h4M8 11.5V14',
  tablet: 'M3.5 1.5h9v13h-9zM7 12.5h2',
  mobile: 'M5 1.5h6v13H5zM7.5 12.5h1',
  cursor: 'M4 2.5l8.5 5-3.8 1L7 12.3z',
  play: 'M5 3.5v9l7-4.5z',
  download: 'M8 2.5v8M4.5 7L8 10.5 11.5 7M3 13.5h10',
  upload: 'M8 10.5v-8M4.5 6L8 2.5 11.5 6M3 13.5h10',
  code: 'M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5',
  sparkle: 'M8 1.5l1.5 5 5 1.5-5 1.5-1.5 5-1.5-5-5-1.5 5-1.5z',
  warning: 'M8 2.2l6.3 11.3H1.7zM8 6.5v3M8 11.6v.01',
  error: 'M8 1.8a6.2 6.2 0 110 12.4A6.2 6.2 0 018 1.8zM8 5v3.6M8 11v.01',
  check: 'M3.5 8.5l3 3 6-7',
  search: 'M7 2.5a4.5 4.5 0 110 9 4.5 4.5 0 010-9zM10.4 10.4L14 14',
  trash: 'M2.5 4.5h11M6.5 4.5V2.5h3v2M4 4.5l.7 9.5h6.6l.7-9.5',
  copy: 'M5.5 5.5h8v8h-8zM10.5 5.5v-3h-8v8h3',
  page: 'M4 1.5h5.5L12 4v10.5H4zM9.5 1.5V4H12',
  layers: 'M8 2l6 3.5L8 9 2 5.5zM2 8.5L8 12l6-3.5',
  blocks:
    'M2.5 2.5h4.5V7H2.5zM9 2.5h4.5V7H9zM2.5 9h4.5v4.5H2.5zM9 9h4.5v4.5H9z',
  external: 'M9.5 2.5h4v4M13.5 2.5L7.5 8.5M11.5 9.5v4h-9v-9h4',
  info: 'M8 1.8a6.2 6.2 0 110 12.4A6.2 6.2 0 018 1.8zM8 7.2V11M8 5v.01',
  grip: 'M6 4h.01M10 4h.01M6 8h.01M10 8h.01M6 12h.01M10 12h.01',
  slot: 'M2.5 4.5h11v7h-11zM5 8h6',
  text: 'M3.5 4V3h9v1M8 3v10M6 13h4',
  quote:
    'M4 9.5V7a2.5 2.5 0 012.5-2.5M9.5 9.5V7A2.5 2.5 0 0112 4.5M3.5 9.5h3v3h-3zM9 9.5h3v3H9z',
  layout: 'M2.5 2.5h11v11h-11zM2.5 6h11M6.5 6v7.5',
  action: 'M5.5 3L13 8.5l-3.5.8L8 13z',
  form: 'M2 5h12v6H2zM4.5 7v2',
  table: 'M2 3h12v10H2zM2 6.5h12M2 10h12M6.5 3v10',
  feedback:
    'M4 3h8a2 2 0 012 2v4a2 2 0 01-2 2H7l-3 2.5V11a2 2 0 01-2-2V5a2 2 0 012-2z',
  media: 'M2 3h12v10H2zM2 11l3.5-3.5 3 3 2-2L14 12M10.5 5.5h.01',
  overlay: 'M4.5 2h9.5v7.5M2 4.5h9.5V14H2z',
  dot: 'M8 6.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z',
  link: 'M6.5 9.5l3-3M7 4.5l1-1a3 3 0 014.2 4.2l-1 1M9 11.5l-1 1A3 3 0 013.8 8.3l1-1',
  pencil: 'M10.5 2.5l3 3-8 8h-3v-3z',
  eye: 'M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8zM8 6a2 2 0 110 4 2 2 0 010-4z',
  help: 'M8 1.8a6.2 6.2 0 110 12.4A6.2 6.2 0 018 1.8zM6.3 6.3a1.8 1.8 0 113 1.3c-.7.5-1.3.9-1.3 1.8M8 11.3v.01',
  replace:
    'M2.8 8a5.2 5.2 0 019-3.6M13.2 8a5.2 5.2 0 01-9 3.6M11.9 1.9v2.6H9.3M4.1 14.1v-2.6h2.6',
  component:
    'M8 1.6l2.3 2.3L8 6.2 5.7 3.9zM8 9.8l2.3 2.3L8 14.4l-2.3-2.3zM3.9 5.7L6.2 8l-2.3 2.3L1.6 8zM12.1 5.7L14.4 8l-2.3 2.3L9.8 8z',
  sun: 'M8 5.2a2.8 2.8 0 110 5.6 2.8 2.8 0 010-5.6zM8 1.5v1.3M8 13.2v1.3M1.5 8h1.3M13.2 8h1.3M3.4 3.4l.9.9M11.7 11.7l.9.9M3.4 12.6l.9-.9M11.7 4.3l.9-.9',
  moon: 'M13.2 9.6A5.6 5.6 0 016.4 2.8a5.6 5.6 0 106.8 6.8z',

  addBefore: 'M2.5 2.5h11M8 6.5v7M4.5 10h7',
  addAfter: 'M2.5 13.5h11M8 2.5v7M4.5 6h7',
  addLeft: 'M2.5 2.5v11M6.5 8h7M10 4.5v7',
  addRight: 'M13.5 2.5v11M2.5 8h7M6 4.5v7',
} as const

export type IconName = keyof typeof PATHS

export function Icon(props: { name: IconName; class?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={props.size ?? 16}
      height={props.size ?? 16}
      fill="none"
      stroke="currentColor"
      stroke-width={props.name === 'more' || props.name === 'grip' ? 2.4 : 1.4}
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      class={`shrink-0 ${props.class ?? ''}`}
    >
      <path d={PATHS[props.name]} />
    </svg>
  )
}

type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

const VARIANTS = {
  primary:
    'bg-accent text-on-accent hover:bg-accent-strong shadow-[0_1px_0_rgb(0_0_0/0.08)]',
  secondary:
    'bg-raised text-ink border border-line-strong hover:bg-hover shadow-[0_1px_0_rgb(0_0_0/0.04)]',
  ghost: 'text-ink-2 hover:bg-hover hover:text-ink',
  danger:
    'bg-raised text-danger border border-line-strong hover:bg-danger-soft',
}

export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, ['variant', 'size', 'class', 'type'])

  return (
    <button
      type={local.type ?? 'button'}
      class={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-40 ${
        local.size === 'sm' ? 'h-7 px-2.5 text-sm' : 'h-8 px-3'
      } ${VARIANTS[local.variant ?? 'secondary']} ${local.class ?? ''}`}
      {...rest}
    />
  )
}

export function IconButton(
  props: JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
    icon: IconName
    label: string
    active?: boolean
    size?: 'sm' | 'md'
    tone?: 'danger'
  }
) {
  const [local, rest] = splitProps(props, [
    'icon',
    'label',
    'active',
    'class',
    'size',
    'tone',
  ])
  const look = () =>
    local.active
      ? 'bg-raised text-ink shadow-[0_0_0_1px_var(--color-line-strong)]'
      : local.tone === 'danger'
        ? 'text-ink-2 hover:bg-danger-soft hover:text-danger'
        : 'text-ink-2 hover:bg-hover hover:text-ink'

  return (
    <button
      type="button"
      aria-label={local.label}
      title={local.label}
      class={`inline-grid place-items-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-35 ${
        local.size === 'sm' ? 'size-6' : 'size-8'
      } ${look()} ${local.class ?? ''}`}
      {...rest}
    >
      <Icon
        name={local.icon}
        size={local.size === 'sm' ? 14 : 16}
      />
    </button>
  )
}

export function Segmented<T extends string>(props: {
  value: T
  options: Array<{ value: T; label: JSX.Element; title?: string }>
  onChange: (value: T) => void
  label: string
  class?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={props.label}
      class={`inline-flex rounded-lg bg-hover p-0.5 ${props.class ?? ''}`}
    >
      <For each={props.options}>
        {o => (
          <button
            type="button"
            role="radio"
            aria-checked={props.value === o.value}
            title={o.title}
            onClick={() => props.onChange(o.value)}
            class={`flex h-7 min-w-7 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors ${
              props.value === o.value
                ? 'bg-raised text-ink shadow-[0_1px_2px_rgb(16_24_40/0.12)]'
                : 'text-ink-2 hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        )}
      </For>
    </div>
  )
}

export function Kbd(props: ParentProps) {
  return (
    <kbd class="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-chrome px-1 font-mono text-xs text-ink-2">
      {props.children}
    </kbd>
  )
}

export function Dialog(
  props: ParentProps<{
    open: boolean
    onClose: () => void
    title: string
    width?: string
  }>
) {
  let ref!: HTMLDialogElement

  createEffect(() => {
    if (props.open && !ref.open) {
      ref.showModal()
    }

    if (!props.open && ref.open) {
      ref.close()
    }
  })

  return (
    <dialog
      ref={ref}
      class="sheet"
      style={{
        width: props.width ?? '440px',
        'max-width': 'calc(100vw - 32px)',
      }}
      onClose={() => props.onClose()}
      onClick={e => e.target === ref && props.onClose()}
      aria-label={props.title}
    >
      <Show when={props.open}>{props.children}</Show>
    </dialog>
  )
}

export function DialogHeader(props: {
  title: string
  onClose: () => void
  children?: JSX.Element
}) {
  return (
    <header class="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div>
        <h2 class="text-[15px] leading-6 font-semibold">{props.title}</h2>

        <Show when={props.children}>
          <p class="mt-0.5 text-sm text-ink-3">{props.children}</p>
        </Show>
      </div>

      <IconButton
        icon="x"
        label="Close"
        size="sm"
        onClick={() => props.onClose()}
      />
    </header>
  )
}

export function Popover(props: {
  trigger: (attrs: { popovertarget: string }) => JSX.Element
  children: (close: () => void) => JSX.Element
  align?: 'start' | 'end'
  class?: string
  role?: JSX.HTMLAttributes<HTMLDivElement>['role']
  label?: string
}) {
  const id = `pop-${createUniqueId()}`
  let pop!: HTMLDivElement
  const place = (e: Event) => {
    if ((e as ToggleEvent).newState !== 'open') {
      return
    }

    const trigger = document.querySelector(`[popovertarget="${id}"]`)

    if (!trigger) {
      return
    }

    const r = trigger.getBoundingClientRect()
    const w = pop.offsetWidth
    const left = props.align === 'end' ? r.right - w : r.left

    pop.style.left = `${Math.max(8, Math.min(left, innerWidth - w - 8))}px`
    pop.style.top = `${Math.max(8, Math.min(r.bottom + 6, innerHeight - pop.offsetHeight - 8))}px`
  }
  const close = () => pop.hidePopover()

  // The server never sets the ref.
  if (!isServer) {
    onCleanup(() => pop.matches(':popover-open') && pop.hidePopover())
  }

  return (
    <>
      {props.trigger({ popovertarget: id })}

      <div
        ref={pop}
        id={id}
        popover
        role={props.role}
        aria-label={props.label}
        class={`menu fixed ${props.class ?? ''}`}
        onToggle={place}
      >
        {props.children(close)}
      </div>
    </>
  )
}

export function Menu(props: {
  trigger: (attrs: {
    popovertarget: string
    'aria-haspopup': 'menu'
  }) => JSX.Element
  items: Array<
    | {
        label: string
        icon?: IconName
        danger?: boolean
        disabled?: boolean

        checked?: boolean
        onSelect: () => void
      }
    | 'separator'
  >
  align?: 'start' | 'end'
}) {
  return (
    <Popover
      role="menu"
      align={props.align}
      trigger={attrs => props.trigger({ ...attrs, 'aria-haspopup': 'menu' })}
    >
      {close => (
        <For each={props.items}>
          {item =>
            item === 'separator' ? (
              <div class="my-1 h-px bg-line" />
            ) : (
              <button
                type="button"
                role={item.checked === undefined ? 'menuitem' : 'menuitemradio'}
                aria-checked={item.checked}
                disabled={item.disabled}
                class={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-left disabled:opacity-40 ${
                  item.danger
                    ? 'text-danger hover:bg-danger-soft'
                    : 'hover:bg-hover'
                }`}
                onClick={() => {
                  close()
                  item.onSelect()
                }}
              >
                <Show when={item.icon}>
                  {icon => (
                    <Icon
                      name={icon()}
                      class={item.danger ? '' : 'text-ink-3'}
                    />
                  )}
                </Show>

                <span class="flex-1">{item.label}</span>

                <Show when={item.checked}>
                  <Icon
                    name="check"
                    size={14}
                    class="text-accent"
                  />
                </Show>
              </button>
            )
          }
        </For>
      )}
    </Popover>
  )
}
