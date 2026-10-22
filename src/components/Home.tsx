import { For, onCleanup, onMount } from 'solid-js'
import { Link } from '@tanstack/solid-router'
import { FAQ, FEATURES, SITE, STEPS } from '../site'
import { BuilderShowcase, ExportExample } from './HomeDemos'
import { SiteFooter, SiteHeader } from './SiteChrome'
import { Icon } from './ui'

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

export function Home() {
  let page!: HTMLDivElement
  let observer: IntersectionObserver | undefined

  onMount(() => {
    if (!('IntersectionObserver' in window)) {
      return
    }

    observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-revealed', '')
            observer?.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.15 }
    )
    page
      .querySelectorAll('[data-reveal]')
      .forEach(element => observer!.observe(element))
  })
  onCleanup(() => observer?.disconnect())

  return (
    <div
      ref={page}
      class="home"
    >
      <a
        href="#main"
        class="home-skip"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main
        id="main"
        tabIndex={-1}
      >
        <section
          class="home-hero"
          aria-labelledby="hero-title"
        >
          <div class="home-container">
            <div class="home-hero-copy">
              <p class="home-eyebrow">
                <span class="home-live-dot" />
                Free Shopify Polaris playground
              </p>
              <h1 id="hero-title">
                Polaris UI builder
                <br />
                <span>for Shopify apps.</span>
              </h1>
              <p class="home-hero-description">
                Drag and drop Shopify's real Polaris web components, start from
                App Home templates, and preview on desktop and mobile. Then
                export React JSX or HTML and paste it into your Shopify app.
              </p>
              <div class="home-hero-actions">
                <Link
                  to="/builder"
                  class="home-button home-button-primary"
                >
                  Start building for free{' '}
                  <Icon
                    name="chevronRight"
                    size={18}
                  />
                </Link>
                <a
                  href="#builder-tour"
                  class="home-button home-button-secondary"
                >
                  <Icon
                    name="play"
                    size={16}
                  />{' '}
                  Explore the builder
                </a>
              </div>
              <p class="home-hero-footnote">
                Free and open source. No signup. Polaris v2 and v1.
              </p>
            </div>
            <BuilderShowcase />
          </div>
        </section>
        <div class="home-platform-strip home-container">
          <p>
            Made for
            <br />
            <strong>Shopify app developers.</strong>
          </p>
          <div>
            <Icon
              name="blocks"
              size={20}
            />
            <span>
              Polaris web components
              <br />
              <small>v2 + v1</small>
            </span>
          </div>
          <div>
            <Icon
              name="code"
              size={20}
            />
            <span>
              React JSX & HTML
              <br />
              <small>Typed export</small>
            </span>
          </div>
          <div>
            <Icon
              name="sparkle"
              size={20}
            />
            <span>
              WebMCP ready
              <br />
              <small>Bring your AI agent</small>
            </span>
          </div>
          <div>
            <Icon
              name="component"
              size={20}
            />
            <span>
              Open source
              <br />
              <small>Free under MIT</small>
            </span>
          </div>
        </div>
        <section
          id="features"
          class="home-section home-container"
          aria-labelledby="features-title"
        >
          <div
            class="home-section-heading"
            data-reveal
          >
            <div>
              <p class="home-eyebrow">The Polaris playground</p>
              <h2 id="features-title">
                Every Polaris component,
                <br />
                live in your browser.
              </h2>
            </div>
            <p>
              All 62 Polaris web components in one visual Shopify app builder,
              with validation that explains itself and starter templates for
              common admin pages.
            </p>
          </div>
          <div class="home-feature-grid">
            <For each={FEATURES}>
              {feature => (
                <article
                  class="home-feature"
                  data-reveal
                >
                  <div class="home-feature-icon">
                    <Icon
                      name={feature.icon}
                      size={22}
                    />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                  <span class="home-feature-detail">{feature.detail}</span>
                </article>
              )}
            </For>
          </div>
        </section>
        <section
          id="how-it-works"
          class="home-workflow"
          aria-labelledby="steps-title"
        >
          <div class="home-container">
            <div
              class="home-section-heading"
              data-reveal
            >
              <div>
                <p class="home-eyebrow">How it works</p>
                <h2 id="steps-title">
                  From Polaris template to exported code in three steps.
                </h2>
              </div>
              <Link
                to="/builder"
                class="home-text-link"
              >
                Open the Polaris builder{' '}
                <Icon
                  name="chevronRight"
                  size={18}
                />
              </Link>
            </div>
            <ol class="home-steps">
              <For each={STEPS}>
                {(step, index) => (
                  <li data-reveal>
                    <span class="home-step-number">
                      0{index() + 1}
                      <span aria-hidden="true" />
                    </span>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </li>
                )}
              </For>
            </ol>
          </div>
        </section>
        <section
          class="home-export home-container home-section"
          aria-labelledby="export-title"
        >
          <div
            class="home-export-copy"
            data-reveal
          >
            <p class="home-eyebrow">Polaris React and HTML export</p>
            <h2 id="export-title">
              Export clean Polaris
              <br />
              React JSX or HTML.
            </h2>
            <p>
              Your layout becomes the same s-* markup Shopify documents for App
              Home. Copy one screen, download a full HTML document with the
              Polaris script tag, or bring typed React JSX into your app.
            </p>
            <ul class="home-check-list">
              <li>
                <Icon name="check" />
                React JSX or TSX typed with @shopify/polaris-types
              </li>
              <li>
                <Icon name="check" />
                One page or your whole project as a ZIP
              </li>
              <li>
                <Icon name="check" />
                Optional Polaris and App Bridge script tags
              </li>
            </ul>
            <Link
              to="/builder"
              class="home-text-link"
            >
              Build it. Take it with you.{' '}
              <Icon
                name="chevronRight"
                size={18}
              />
            </Link>
          </div>
          <div data-reveal>
            <ExportExample
              markup={MARKUP}
              name="Overview"
            />
          </div>
        </section>
        <section
          class="home-together home-container"
          aria-labelledby="together-title"
        >
          <div
            class="home-section-heading"
            data-reveal
          >
            <div>
              <p class="home-eyebrow">Collaboration and AI agents</p>
              <h2 id="together-title">
                Build Shopify admin screens together, or with an AI agent.
              </h2>
            </div>
          </div>
          <div class="home-together-grid">
            <article
              class="home-team-card"
              data-reveal
            >
              <div
                class="home-team-visual"
                role="img"
                aria-label="Illustration of two collaborators working on a shared app screen"
              >
                <div class="home-mini-page">
                  <span class="home-mini-heading">Your next app</span>
                  <div class="home-mini-block">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div class="home-mini-grid">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
                <span class="home-person home-person-you">
                  <Icon
                    name="cursor"
                    size={21}
                  />
                  <span>You</span>
                </span>
                <span class="home-person home-person-teammate">
                  <Icon
                    name="cursor"
                    size={21}
                  />
                  <span>Teammate</span>
                </span>
                <span class="home-shared-note">
                  <Icon
                    name="link"
                    size={14}
                  />
                  One link. A shared canvas.
                </span>
              </div>
              <div class="home-card-copy">
                <p class="home-eyebrow">Real-time collaboration</p>
                <h3>Share a link. Build together.</h3>
                <p>
                  Invite someone into a shared copy of your workspace. Edit the
                  same screens in real time, with undo for your own changes.
                  Your personal workspace stays separate.
                </p>
                <a
                  href="#sharing-faq"
                  class="home-text-link"
                >
                  How shared sessions work{' '}
                  <Icon
                    name="chevronRight"
                    size={16}
                  />
                </a>
              </div>
            </article>
            <article
              class="home-agent-card"
              data-reveal
            >
              <div class="home-agent-visual">
                <div class="home-agent-prompt">
                  <Icon
                    name="sparkle"
                    size={19}
                  />
                  <span>“Build a settings page for my app.”</span>
                </div>
                <div
                  class="home-agent-tools"
                  role="group"
                  aria-label="Example WebMCP workflow"
                >
                  <For
                    each={[
                      'Read the component catalog',
                      'Build with real Polaris',
                      'Validate and export',
                    ]}
                  >
                    {(label, index) => (
                      <div style={{ '--step': index() }}>
                        <span class="home-agent-step">0{index() + 1}</span>
                        {label}
                        <Icon
                          name="check"
                          size={15}
                        />
                      </div>
                    )}
                  </For>
                </div>
                <span class="home-agent-note">
                  Example workflow · Requires a WebMCP-compatible browser
                </span>
              </div>
              <div class="home-card-copy">
                <p class="home-eyebrow">WebMCP agent tools</p>
                <h3>Let your agent do the clicking.</h3>
                <p>
                  With WebMCP, an AI agent can inspect components, build pages,
                  check layouts, and export code alongside you. See its changes
                  in the canvas, and undo them like your own.
                </p>
                <a
                  href={`${SITE.repository}#webmcp`}
                  class="home-text-link"
                >
                  Explore the agent tools{' '}
                  <Icon
                    name="external"
                    size={15}
                  />
                </a>
              </div>
            </article>
          </div>
        </section>
        <section
          id="faq"
          class="home-faq home-container home-section"
          aria-labelledby="faq-title"
        >
          <div data-reveal>
            <p class="home-eyebrow">FAQ</p>
            <h2 id="faq-title">
              Shopify Polaris
              <br />
              builder FAQ.
            </h2>
            <p>
              Have another question?
              <br />
              <a
                href={`${SITE.repository}/issues`}
                class="home-text-link"
              >
                Find us on GitHub{' '}
                <Icon
                  name="external"
                  size={14}
                />
              </a>
            </p>
          </div>
          <div class="home-faq-list">
            <For each={FAQ}>
              {item => (
                <details id={item.id}>
                  <summary>
                    {item.q}
                    <Icon
                      name="plus"
                      size={17}
                    />
                  </summary>
                  <p>{item.a}</p>
                </details>
              )}
            </For>
          </div>
        </section>
        <section
          class="home-final"
          aria-labelledby="cta-title"
        >
          <div
            class="home-container"
            data-reveal
          >
            <p class="home-eyebrow">Free. Open source. No signup.</p>
            <h2 id="cta-title">
              Start building
              <br />
              your Shopify app UI.
            </h2>
            <p>
              Open the Polaris playground in one browser tab. Nothing to
              install.
            </p>
            <Link
              to="/builder"
              class="home-button home-button-white"
            >
              Open the builder{' '}
              <Icon
                name="chevronRight"
                size={18}
              />
            </Link>
            <span class="home-final-note">
              Free to use. Open source. Yours to explore.
            </span>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
