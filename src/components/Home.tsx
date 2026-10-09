import { For, onCleanup, onMount } from 'solid-js'
import { Link } from '@tanstack/solid-router'
import { FAQ, FEATURES, SITE, STEPS } from '../site'
import { initTheme } from '../editor/theme'
import { BuilderShowcase, ExportExample } from './HomeDemos'
import { Logo } from './Logo'
import { ThemeMenu } from './ThemeMenu'
import { Icon } from './ui'

export function Home() {
  let page!: HTMLDivElement
  let observer: IntersectionObserver | undefined

  onMount(() => {
    initTheme()

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
      <header class="home-header">
        <div class="home-container home-header-inner">
          <Link
            to="/"
            class="home-brand"
          >
            <Logo />
            {SITE.name}
            <span class="home-brand-mark">/</span>
          </Link>
          <nav
            aria-label="Main"
            class="home-nav"
          >
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div class="home-header-actions">
            <a
              href={SITE.repository}
              class="home-github"
            >
              GitHub{' '}
              <Icon
                name="external"
                size={13}
              />
            </a>
            <ThemeMenu />
            <Link
              to="/builder"
              class="home-button home-button-primary home-nav-cta"
            >
              Open builder{' '}
              <Icon
                name="chevronRight"
                size={15}
              />
            </Link>
          </div>
        </div>
      </header>
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
                The free Polaris visual builder
              </p>
              <h1 id="hero-title">
                Shopify app UI.
                <br />
                <span>From idea to real.</span>
              </h1>
              <p class="home-hero-description">
                Build with real Polaris web components. Drag, refine, and
                preview your next Shopify app screen. Then take the code with
                you.
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
                No signup. No installation. Just open and create.
              </p>
            </div>
            <BuilderShowcase />
          </div>
        </section>
        <div class="home-platform-strip home-container">
          <p>
            Made for your
            <br />
            <strong>Shopify app workflow.</strong>
          </p>
          <div>
            <Icon
              name="blocks"
              size={20}
            />
            <span>
              Real Polaris
              <br />
              <small>v1 + v2 RC</small>
            </span>
          </div>
          <div>
            <Icon
              name="code"
              size={20}
            />
            <span>
              HTML & React
              <br />
              <small>Code you can use</small>
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
              <p class="home-eyebrow">Less friction. More flow.</p>
              <h2 id="features-title">
                Everything clicks
                <br />
                into place.
              </h2>
            </div>
            <p>
              A visual Shopify Polaris builder that understands what you're
              making. Real components, useful guardrails, and room to
              experiment.
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
                <p class="home-eyebrow">A shorter path from here to there</p>
                <h2 id="steps-title">Open. Build. Make it yours.</h2>
              </div>
              <Link
                to="/builder"
                class="home-text-link"
              >
                Let's build something{' '}
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
            <p class="home-eyebrow">A prototype with somewhere to go</p>
            <h2 id="export-title">
              Looks right.
              <br />
              Exports right.
            </h2>
            <p>
              Your layout becomes readable Polaris markup. Copy a single screen,
              download a full HTML document, or bring typed React JSX into your
              app.
            </p>
            <ul class="home-check-list">
              <li>
                <Icon name="check" />
                HTML or React JSX, with TypeScript support
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
            <ExportExample />
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
              <p class="home-eyebrow">A little company goes a long way</p>
              <h2 id="together-title">Good ideas travel better together.</h2>
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
                <p class="home-eyebrow">Multiplayer, without the meetings</p>
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
                <p class="home-eyebrow">Your AI gets a seat at the canvas</p>
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
            <p class="home-eyebrow">Before you dive in</p>
            <h2 id="faq-title">
              A few things
              <br />
              worth knowing.
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
            <p class="home-eyebrow">Your next “what if” starts here</p>
            <h2 id="cta-title">
              Less setup.
              <br />
              More “look what I built.”
            </h2>
            <p>One browser tab. All the space you need to start.</p>
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
      <footer class="home-footer home-container">
        <div>
          <Link
            to="/"
            class="home-brand"
          >
            <Logo />
            {SITE.name}
          </Link>
          <p>A small tool for your next big idea.</p>
        </div>
        <nav aria-label="Footer">
          <Link to="/builder">Builder</Link>
          <Link to="/privacy">Privacy &amp; choices</Link>
          <a href={SITE.repository}>GitHub</a>
          <a href="https://shopify.dev/docs/api/app-home/web-components">
            Polaris docs
          </a>
          <a href="/llms.txt">llms.txt</a>
        </nav>
        <p class="home-disclaimer">
          Independent and open source. Not affiliated with or endorsed by
          Shopify. Shopify and Polaris are trademarks of Shopify Inc.
        </p>
        <a
          class="home-license"
          href={`${SITE.repository}/blob/main/LICENSE`}
        >
          Made to be shared. MIT licensed.
        </a>
      </footer>
    </div>
  )
}
