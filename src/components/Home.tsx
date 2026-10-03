import { For, onMount } from 'solid-js'
import { Link } from '@tanstack/solid-router'
import { FAQ, FEATURES, SITE, STEPS } from '../site'
import { initTheme, isDark } from '../editor/theme'
import { Logo } from './Logo'
import { ThemeMenu } from './ThemeMenu'
import { Icon } from './ui'

const button =
  'items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors'
const large = `${button} inline-flex h-11 px-5 text-[15px]`
const primaryColors =
  'bg-accent text-on-accent shadow-[0_1px_0_rgb(0_0_0/0.08)] hover:bg-accent-strong'
const primary = `${large} ${primaryColors}`
const secondary = `${large} border border-line-strong bg-raised text-ink hover:bg-hover`

export function Home() {
  onMount(initTheme)

  return (
    <div class="min-h-dvh bg-chrome text-[15px] leading-6">
      <a
        href="#main"
        class="sr-only z-50 rounded-md bg-panel px-3 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <header class="sticky top-0 z-20 border-b border-line bg-chrome/85 backdrop-blur">
        <div class="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5">
          <Link
            to="/"
            class="flex items-center gap-2 font-semibold whitespace-nowrap"
          >
            <Logo />

            {SITE.name}
          </Link>

          <nav
            aria-label="Main"
            class="ml-auto hidden items-center gap-6 text-[14px] text-ink-2 sm:flex"
          >
            <a
              href="#features"
              class="hover:text-ink"
            >
              Features
            </a>

            <a
              href="#how-it-works"
              class="hover:text-ink"
            >
              How it works
            </a>

            <a
              href="#faq"
              class="hover:text-ink"
            >
              FAQ
            </a>
          </nav>

          <div class="ml-auto flex items-center gap-2 sm:ml-0">
            <ThemeMenu />

            {/* The builder needs a wide screen; phones get the hero's link. */}
            <Link
              to="/builder"
              class={`${button} ${primaryColors} hidden h-9 px-4 text-[14px] sm:inline-flex`}
            >
              Open the builder
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        <section
          aria-labelledby="hero-title"
          class="mx-auto max-w-6xl px-5 pt-16 pb-12 sm:pt-24"
        >
          <h1
            id="hero-title"
            class="max-w-3xl text-[40px] leading-[1.06] font-semibold tracking-[-0.025em] text-balance sm:text-[58px]"
          >
            Prototype Shopify app screens with real Polaris components
          </h1>

          <p class="mt-6 max-w-xl text-[17px] leading-7 text-ink-2">
            Drag Polaris web components into a live preview, let the builder
            check them against Polaris rules, and export HTML or React. Free and
            open source, in your browser, with no account.
          </p>

          <div class="mt-8 flex flex-wrap gap-3">
            <Link
              to="/builder"
              class={primary}
            >
              Open the builder
            </Link>

            <a
              href="#how-it-works"
              class={secondary}
            >
              See how it works
            </a>
          </div>

          <ul class="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-ink-2">
            <For
              each={[
                'Polaris v1 and the 2.0 release candidate',
                'HTML and React export',
                'Saved in your browser',
              ]}
            >
              {fact => (
                <li class="flex items-center gap-1.5">
                  <Icon
                    name="check"
                    size={15}
                    class="text-ok"
                  />

                  {fact}
                </li>
              )}
            </For>
          </ul>
        </section>

        <div class="mx-auto max-w-6xl px-5">
          <img
            src={`/builder-screenshot-${isDark() ? 'dark' : 'light'}.webp`}
            alt="Polaris Playground showing a Billing screen with plan details, usage and payments, alongside component layers and the inspector"
            width="1280"
            height="800"
            class="block h-auto w-full rounded-2xl border border-line-strong shadow-[0_1px_2px_rgb(16_24_40/0.06),0_24px_64px_-24px_rgb(16_24_40/0.35)]"
          />
        </div>

        <section
          id="features"
          aria-labelledby="features-title"
          class="mx-auto max-w-6xl scroll-mt-20 px-5 pt-28 pb-24"
        >
          <h2
            id="features-title"
            class="max-w-2xl text-[32px] leading-tight font-semibold tracking-[-0.02em]"
          >
            Everything you need to sketch an App Home screen
          </h2>

          <p class="mt-3 max-w-2xl text-[17px] leading-7 text-ink-2">
            Built on Shopify's official component catalog, so what you design is
            what Polaris can actually render.
          </p>

          <div class="mt-12 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            <For each={FEATURES}>
              {f => (
                <article class="bg-panel p-6">
                  <Icon
                    name={f.icon}
                    size={20}
                    class="text-accent"
                  />

                  <h3 class="mt-4 text-[16px] font-semibold">{f.title}</h3>

                  <p class="mt-1.5 text-ink-2">{f.body}</p>
                </article>
              )}
            </For>
          </div>
        </section>

        <section
          id="how-it-works"
          aria-labelledby="steps-title"
          class="scroll-mt-14 border-y border-line bg-panel"
        >
          <div class="mx-auto max-w-6xl px-5 py-24">
            <h2
              id="steps-title"
              class="text-[32px] leading-tight font-semibold tracking-[-0.02em]"
            >
              How it works
            </h2>

            <ol class="mt-12 grid gap-10 md:grid-cols-3">
              <For each={STEPS}>
                {(step, i) => (
                  <li>
                    <span class="grid size-8 place-items-center rounded-full bg-accent-soft text-[14px] font-semibold text-accent tabular-nums">
                      {i() + 1}
                    </span>

                    <h3 class="mt-4 text-[16px] font-semibold">{step.title}</h3>

                    <p class="mt-1.5 text-ink-2">{step.body}</p>
                  </li>
                )}
              </For>
            </ol>
          </div>
        </section>

        <section
          id="faq"
          aria-labelledby="faq-title"
          class="mx-auto max-w-6xl scroll-mt-20 px-5 py-24"
        >
          <h2
            id="faq-title"
            class="text-[32px] leading-tight font-semibold tracking-[-0.02em]"
          >
            Questions and answers
          </h2>

          <div class="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
            <For each={FAQ}>
              {item => (
                <div>
                  <h3 class="text-[16px] font-semibold">{item.q}</h3>

                  <p class="mt-2 text-ink-2">{item.a}</p>
                </div>
              )}
            </For>
          </div>
        </section>

        <section
          aria-labelledby="cta-title"
          class="mx-auto max-w-6xl px-5 pb-24"
        >
          <div class="drafting flex flex-col items-start gap-6 rounded-2xl border border-line p-10 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2
                id="cta-title"
                class="text-[26px] leading-tight font-semibold tracking-[-0.02em]"
              >
                Your next screen is a few drags away
              </h2>

              <p class="mt-2 text-ink-2">
                Start from a layout, or from a blank page.
              </p>
            </div>

            <Link
              to="/builder"
              class={primary}
            >
              Open the builder
            </Link>
          </div>
        </section>
      </main>

      <footer class="border-t border-line">
        <div class="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-[13px] text-ink-2 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {SITE.name} is an independent tool. Shopify and Polaris are
            trademarks of Shopify Inc.
          </p>

          <nav
            aria-label="Footer"
            class="flex gap-5"
          >
            <Link
              to="/builder"
              class="hover:text-ink"
            >
              Builder
            </Link>

            <a
              href={SITE.repository}
              class="hover:text-ink"
            >
              GitHub
            </a>

            <a
              href="https://shopify.dev/docs/api/app-home/web-components"
              class="hover:text-ink"
              rel="noopener"
            >
              Polaris docs
            </a>

            <a
              href="/llms.txt"
              class="hover:text-ink"
            >
              llms.txt
            </a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
