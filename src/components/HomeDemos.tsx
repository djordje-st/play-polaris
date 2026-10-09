import { For, Show, createSignal } from 'solid-js'
import { isDark } from '../editor/theme'
import { Icon } from './ui'

const TOUR = [
  {
    title: 'Build visually',
    image: '/builder-screenshot',
    caption:
      'Find your component. Drop it into place. See your screen take shape.',
    alt: 'PlayPolaris visual builder with the Polaris component palette, an app overview screen, and a live property inspector',
    label: 'Your ideas, assembled.',
  },
  {
    title: 'Refine the details',
    image: '/home/inspect',
    caption:
      'Select any layer to edit its properties, content, and slot placement.',
    alt: 'Shopify Polaris section selected in the layers tree and live preview, with its heading and properties open in the inspector',
    label: 'Every detail, in reach.',
  },
  {
    title: 'Take the code',
    image: '/home/export',
    caption: 'Export a page or the whole project as HTML or typed React JSX.',
    alt: 'PlayPolaris export dialog displaying a Shopify app screen as React JSX with TypeScript, copy, and download options',
    label: 'Ready for your codebase.',
  },
] as const

export function BuilderShowcase() {
  const [active, setActive] = createSignal(0)
  const step = () => TOUR[active()]!
  const source = () => `${step().image}-${isDark() ? 'dark' : 'light'}`

  return (
    <div
      class="home-showcase"
      id="builder-tour"
    >
      <div
        class="home-tour-controls"
        role="group"
        aria-label="Explore the builder"
      >
        <For each={TOUR}>
          {(item, index) => (
            <button
              type="button"
              aria-pressed={active() === index()}
              aria-controls="builder-tour-image"
              onClick={() => setActive(index())}
            >
              <span class="home-tour-number">0{index() + 1}</span>
              {item.title}
              <Icon
                name="chevronRight"
                size={14}
              />
            </button>
          )}
        </For>
      </div>
      <figure>
        <div
          class="home-screenshot-frame"
          id="builder-tour-image"
        >
          <Show
            when={source()}
            keyed
          >
            {src => {
              const format = src.startsWith('/builder-screenshot')
                ? 'avif'
                : 'webp'

              return (
                <picture>
                  <source
                    type={`image/${format}`}
                    srcset={`${src}-768.${format} 768w, ${src}.${format} 1280w`}
                    sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1240px) calc(100vw - 80px), 1160px"
                  />
                  <img
                    src={`${src}.webp`}
                    srcset={`${src}-768.webp 768w, ${src}.webp 1280w`}
                    sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1240px) calc(100vw - 80px), 1160px"
                    alt={step().alt}
                    width="1280"
                    height="800"
                    fetchpriority="high"
                    decoding="async"
                  />
                </picture>
              )
            }}
          </Show>
          <div
            class="home-screen-note"
            aria-hidden="true"
          >
            <Icon
              name="check"
              size={14}
            />
            {step().label}
          </div>
        </div>
        <figcaption aria-live="polite">
          <span
            class="home-live-dot"
            aria-hidden="true"
          />
          {step().caption}
          <span class="home-capture-label">
            Actual builder. Example project.
          </span>
        </figcaption>
      </figure>
    </div>
  )
}

const MARKUP = `<s-page heading="Your next big idea">
  <s-button slot="primary-action" variant="primary">
    Make it happen
  </s-button>
  <s-section heading="Made for your merchants">
    <s-paragraph>
      A little less setup. A lot more possibility.
    </s-paragraph>
  </s-section>
</s-page>`

export function ExportExample() {
  const [format, setFormat] = createSignal<'html' | 'jsx'>('html')
  const code = () =>
    format() === 'html'
      ? MARKUP
      : `/// <reference types="@shopify/polaris-types" />\n\nexport default function AppScreen() {\n  return (\n${MARKUP.split(
          '\n'
        )
          .map(line => `    ${line}`)
          .join('\n')}\n  );\n}`

  return (
    <div class="home-code-window">
      <div class="home-code-toolbar">
        <div
          role="group"
          aria-label="Export example format"
        >
          <button
            type="button"
            aria-pressed={format() === 'html'}
            onClick={() => setFormat('html')}
          >
            HTML
          </button>
          <button
            type="button"
            aria-pressed={format() === 'jsx'}
            onClick={() => setFormat('jsx')}
          >
            React JSX
          </button>
        </div>
        <span>{format() === 'html' ? 'app-screen.html' : 'AppScreen.tsx'}</span>
      </div>
      <pre
        role="region"
        aria-label={`${format() === 'html' ? 'HTML' : 'React JSX'} export example`}
        tabIndex={0}
      >
        <code>{code()}</code>
      </pre>
      <div class="home-code-footer">
        <Icon
          name="check"
          size={14}
        />{' '}
        Your components. Your codebase.
      </div>
    </div>
  )
}
