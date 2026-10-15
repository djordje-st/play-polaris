import { onMount } from 'solid-js'
import { Link } from '@tanstack/solid-router'
import { SITE } from '../site'
import { initTheme } from '../editor/theme'
import { Logo } from './Logo'
import { ThemeMenu } from './ThemeMenu'
import { Icon } from './ui'

export function SiteHeader() {
  onMount(initTheme)

  return (
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
          <Link
            to="/"
            hash="faq"
            activeOptions={{ includeHash: true }}
          >
            FAQ
          </Link>
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
  )
}

export function SiteFooter() {
  return (
    <footer class="home-footer home-container">
      <div>
        <Link
          to="/"
          class="home-brand"
        >
          <Logo />
          {SITE.name}
        </Link>
        <p>A free Shopify Polaris playground and app UI builder.</p>
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
        Independent and open source. Not affiliated with or endorsed by Shopify.
        Shopify and Polaris are trademarks of Shopify Inc.
      </p>
      <a
        class="home-license"
        href={`${SITE.repository}/blob/main/LICENSE`}
      >
        Made to be shared. MIT licensed.
      </a>
    </footer>
  )
}
