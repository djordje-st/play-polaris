import { Link, createFileRoute } from '@tanstack/solid-router'
import { onMount } from 'solid-js'
import { Logo } from '../components/Logo'
import { ThemeMenu } from '../components/ThemeMenu'
import { PrivacyChoices } from '../components/PrivacyChoices'
import { initTheme } from '../editor/theme'
import { SITE } from '../site'
import '../components/Home.css'
import '../components/Privacy.css'

export const Route = createFileRoute('/privacy')({
  head: () => ({
    meta: [
      { title: 'Privacy policy | PlayPolaris' },
      {
        name: 'description',
        content:
          'How PlayPolaris stores projects, handles shared rooms and analytics, and responds to privacy requests.',
      },
      {
        property: 'og:title',
        content: 'Privacy policy | PlayPolaris',
      },
      {
        property: 'og:description',
        content:
          'How PlayPolaris stores projects, handles shared rooms and analytics, and responds to privacy requests.',
      },
      { property: 'og:url', content: `${SITE.url}/privacy` },
      { property: 'og:type', content: 'website' },
      { name: 'robots', content: 'index, follow' },
    ],
    links: [{ rel: 'canonical', href: `${SITE.url}/privacy` }],
  }),
  component: Privacy,
})

function Privacy() {
  onMount(initTheme)

  return (
    <div class="home privacy-page">
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
          <div class="home-header-actions">
            <ThemeMenu />
            <Link
              to="/builder"
              class="home-button home-button-primary"
            >
              Open builder
            </Link>
          </div>
        </div>
      </header>

      <main
        id="main"
        tabIndex={-1}
        class="home-container"
      >
        <div class="privacy-intro">
          <h1>Privacy policy</h1>
          <p class="privacy-updated">
            Last updated <time dateTime="2026-10-09">9 October 2026</time>
          </p>
        </div>

        <article
          class="privacy-body"
          aria-label="Privacy policy"
        >
          <section id="operator">
            <h2>Who runs PlayPolaris</h2>
            <p>
              <strong>EvoLabs</strong>, based in <strong>Serbia</strong>, runs{' '}
              <a href={SITE.url}>playpolaris.dev</a> and is responsible for the
              personal data processed through this site (the data controller).
              In this policy, “we” means EvoLabs.
            </p>
            <p>
              PlayPolaris is an independent, open-source tool. It does not
              connect to Shopify stores or read merchant or customer records.
            </p>
            <p>
              No account, payment or mailing-list sign-up is required. You can
              use the builder without giving us your name or email. This policy
              covers our website. People hosting their own copies are
              responsible for those sites.
            </p>
          </section>

          <section id="local-data">
            <h2>Data stored in your browser</h2>
            <p>
              Pages, text, saved components, component settings and workspace
              settings stay in your browser’s IndexedDB storage. Your theme,
              tour status and analytics choice use local storage. We do not use
              advertising cookies.
            </p>
            <p>
              We do not upload your personal workspace to a project database.
              Exports happen in your browser. Shared rooms and connected AI
              tools can access your work as described below.
            </p>
            <p>
              Blocking browser storage can prevent saving. Clearing site data
              can delete your work. Other browsers and private windows use
              separate storage. Export work you want to keep.
            </p>
          </section>

          <section id="sharing">
            <h2>Shared rooms and external tools</h2>
            <h3>Shared rooms</h3>
            <p>
              Cloudflare receives your room ID and connection details, and
              passes document content and edits to other participants. Each
              browser saves its own copy. The relay does not store a permanent
              copy in a server database.
            </p>
            <p>
              <strong>
                Anyone with the room link can read and edit the room.
              </strong>{' '}
              Connections are encrypted, but rooms are not end-to-end encrypted.
              Other participants can keep or export copies. Clearing your
              browser does not delete theirs. Room links do not expire and
              cannot be revoked.
            </p>
            <h3>AI agents and external assets</h3>
            <p>
              An AI agent connected through WebMCP can read and edit your
              workspace and export code. PlayPolaris does not send projects to
              an AI provider by itself. Connected browsers, extensions and
              agents handle data under their own privacy policies.
            </p>
            <p>
              The builder loads Polaris scripts and sample images from Shopify.
              External images and other resources you add contact their hosts,
              which receive your IP address and connection details. Use sample
              data in prototypes, not confidential or real customer data.
            </p>
          </section>

          <section id="analytics">
            <h2>Optional analytics</h2>
            <p>
              We use <a href="https://docs.umami.is/docs/faq">Umami</a>, hosted
              on Railway, to measure page visits. It loads only after you choose
              “Allow analytics”. The builder works without it.
            </p>
            <p>
              Analytics sends the page path, a fixed page title, referring
              website origin, browser language and screen size. Umami also
              receives your IP address and request headers to calculate visit
              statistics and approximate location. It does not use cookies.
            </p>
            <p>
              We remove URL query strings and fragments, including room keys. We
              do not send project content, custom events or account IDs. We do
              not record sessions, track you across websites, sell personal data
              or share it for targeted advertising.
            </p>
            <p>
              You can turn analytics off below. This stops new events without
              undoing earlier processing. Do Not Track and Global Privacy
              Control keep analytics off, even if you previously allowed it.
              Your choice applies to this browser only.
            </p>
            <PrivacyChoices inline />
          </section>

          <section id="providers">
            <h2>Service providers</h2>
            <p>
              Services that receive requests can see your IP address, request
              time, URL and browser headers. We use:
            </p>
            <ul>
              <li>
                <strong>Cloudflare:</strong> website hosting, delivery, security
                and the shared-room relay. See{' '}
                <a href="https://www.cloudflare.com/privacypolicy/">
                  Cloudflare’s privacy policy
                </a>
                .
              </li>
              <li>
                <strong>Railway:</strong> hosting for our optional Umami
                analytics service. See{' '}
                <a href="https://railway.com/legal/privacy">
                  Railway’s privacy policy
                </a>
                .
              </li>
              <li>
                <strong>Shopify:</strong> delivering Polaris runtime files and
                sample assets when you use the builder. See{' '}
                <a href="https://www.shopify.com/legal/privacy">
                  Shopify’s privacy policy
                </a>
                .
              </li>
              <li>
                <strong>Google:</strong> providing Gmail for our privacy
                contact. Google processes messages you send to that address,
                including your email address and message content. See{' '}
                <a href="https://policies.google.com/privacy">
                  Google’s privacy policy
                </a>
                .
              </li>
              <li>
                <strong>Services you choose:</strong> connected AI tools,
                external asset hosts, and GitHub if you visit the repository or
                submit an issue. Their policies apply to their services.
              </li>
            </ul>
            <p>
              These providers operate internationally, including in the United
              States, so processing may occur outside your country. Cloudflare
              and Railway describe their use of the EU–US Data Privacy Framework
              and standard contractual safeguards in the policies linked above.
            </p>
            <p>
              Where data-protection law requires a legal basis, we rely on
              legitimate interests in providing and securing the site,
              delivering features you request, and answering messages. Optional
              analytics uses consent. We may also process or disclose
              information when necessary to meet a legal obligation or protect
              rights and security.
            </p>
          </section>

          <section id="retention">
            <h2>How long data is kept</h2>
            <ul>
              <li>
                <strong>Browser projects and preferences:</strong> until you
                delete them or your browser clears its storage. No fixed
                automatic expiry is set.
              </li>
              <li>
                <strong>Shared-room documents:</strong> the relay forwards
                updates during the session without persistent document storage.
                Participant copies remain in their browsers until removed.
                Connection metadata can be handled by the hosting provider
                separately.
              </li>
              <li>
                <strong>Analytics:</strong> stored in our self-hosted Umami
                database until deleted by the operator. This application does
                not configure automatic expiry. Withdrawing consent stops new
                collection; it does not remove existing records.
              </li>
              <li>
                <strong>Hosting and security records:</strong> handled under the
                providers’ service settings and retention policies linked above.
                The application does not maintain a separate access-log
                database.
              </li>
              <li>
                <strong>Messages you send:</strong> kept as needed to answer
                your request, handle follow-up questions or meet a legal
                obligation.
              </li>
            </ul>
            <h3>Delete local work</h3>
            <p>
              In your personal workspace, use <strong>Clear local data</strong>{' '}
              to remove pages, saved components and workspace settings. This
              does not clear shared-room copies or every browser preference. To
              remove all local PlayPolaris data, close its tabs and clear site
              data for playpolaris.dev in your browser settings. Export first:
              deleted local projects cannot be restored by us.
            </p>
          </section>

          <section id="rights">
            <h2>Your rights</h2>
            <p>
              Depending on the law that applies, you can ask to access, correct,
              delete, restrict processing of or receive a portable copy of your
              personal data. You can withdraw analytics consent and still use
              the builder. We do not make automated decisions with legal or
              similarly significant effects on you.
            </p>
            <p>
              <strong>Right to object:</strong> you may object to processing
              based on legitimate interests. We will consider your circumstances
              and the applicable legal requirements.
            </p>
            <p>
              We may need details to verify your request and find your data. We
              do not collect extra identifying data to identify anonymous usage
              records. We cannot access or delete projects stored only on your
              device or copies kept by other participants.
            </p>
            <p>
              You can complain to a competent data-protection authority. In
              Serbia, this is the{' '}
              <a href="https://poverenik.rs/en/home/">
                Commissioner for Information of Public Importance and Personal
                Data Protection
              </a>
              . EEA residents can find their local authority in the{' '}
              <a href="https://www.edpb.europa.eu/about-edpb/our-members_en">
                EDPB directory
              </a>
              ; UK residents can contact the{' '}
              <a href="https://ico.org.uk/make-a-complaint/">ICO</a>.
            </p>
            <h3>Children</h3>
            <p>
              PlayPolaris is not intended for children under 16. We do not
              knowingly ask for children’s personal data. Contact us if a child
              has shared personal data so we can review and remove it where
              possible.
            </p>
          </section>

          <section id="contact">
            <h2>Contact</h2>
            <p>
              Send privacy questions and requests to EvoLabs at{' '}
              <a href="mailto:djordje42@gmail.com">djordje42@gmail.com</a>. We
              use your email address and message to respond.
            </p>
            <p>
              Do not post personal data, exported projects or room links in
              public GitHub issues.
            </p>
            <p>
              We update this policy when our data practices change and show the
              date above. We will highlight major changes on the site and ask
              for consent before any new use that requires it.
            </p>
          </section>
        </article>
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
        </div>
        <nav aria-label="Footer">
          <Link to="/">Home</Link>
          <Link to="/builder">Builder</Link>
          <a href={SITE.repository}>GitHub</a>
          <a href="#analytics">Privacy choices</a>
        </nav>
        <p class="home-disclaimer">
          Independent and open source. Not affiliated with or endorsed by
          Shopify.
        </p>
      </footer>
    </div>
  )
}
