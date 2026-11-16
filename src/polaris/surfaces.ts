// Fixed stand-ins for the Shopify pages that host UI extensions. Each screen
// leaves a mount where the open page's extension target renders.

const IMG = 'https://cdn.shopify.com/static/sample-images'

type Mount = (target: string) => string

// Layout and sizes follow Shopify's default checkout and customer accounts.

const thumb = (img: string, badge = '') =>
  `<s-product-thumbnail src="${IMG}/${img}" alt=""${badge}></s-product-thumbnail>`

const line = (
  title: string,
  variant: string,
  price: string,
  img: string,
  slot = '',
  badge = ' totalItems="1"'
) => /* HTML */ `
  <div class="pg-line">
    ${thumb(img, badge)}
    <div class="pg-grow">
      <div>${title}</div>
      <div class="pg-sub">${variant}</div>
      ${slot}
    </div>
    <div>${price}</div>
  </div>
`

// Checkout shows the quantity on each thumbnail; customer accounts don't.
const lines = (itemSlot: string, badge?: string) =>
  line(
    'Ceramic teapot',
    'Sage / 1 L',
    '$42.00',
    'teapot.jpg',
    itemSlot,
    badge
  ) + line('Lavender bath salts', '500 g', '$16.00', 'bath.jpeg', '', badge)

const TOTALS = /* HTML */ `
  <div class="pg-totals">
    <div>
      <span>Subtotal · 2 items</span>
      <span>$58.00</span>
    </div>
    <div>
      <span>Shipping</span>
      <span>$5.00</span>
    </div>
    <div class="pg-total">
      <span>Total</span>
      <span>
        <small>USD</small>
        $63.00
      </span>
    </div>
  </div>
`

const FOOTER = /* HTML */ `
  <footer class="pg-footer">
    <s-link>Refund policy</s-link>
    <s-link>Shipping</s-link>
    <s-link>Privacy policy</s-link>
    <s-link>Terms of service</s-link>
  </footer>
`

const option = (
  on: boolean,
  title: string,
  sub: string,
  price: string,
  slot = ''
) => /* HTML */ `
  <div class="pg-option${on ? ' on' : ''}">
    <span class="pg-radio"></span>
    <div class="pg-grow">
      <div>${title}</div>
      ${sub && `<div class="pg-sub">${sub}</div>`} ${slot}
    </div>
    <div>${price}</div>
  </div>
`

function delivery(target: string, m: Mount) {
  const pickup = /pickup-(location|point)/.exec(target)?.[1]

  if (!pickup) {
    return /* HTML */ `
      <section class="pg-sec">
        <s-heading>Delivery</s-heading>
        ${m('purchase.checkout.delivery-address.render-before')}
        <s-select label="Country/Region">
          <s-option selected>United States</s-option>
        </s-select>
        <div class="pg-2">
          <s-text-field
            label="First name (optional)"
            value="Jane"
          ></s-text-field>
          <s-text-field
            label="Last name"
            value="Doe"
          ></s-text-field>
        </div>
        <s-text-field
          label="Address"
          value="151 O'Connor Street"
          icon="search"
        ></s-text-field>
        <s-text-field label="Apartment, suite, etc. (optional)"></s-text-field>
        <div class="pg-3">
          <s-text-field
            label="City"
            value="Portland"
          ></s-text-field>
          <s-select label="State">
            <s-option selected>Oregon</s-option>
          </s-select>
          <s-text-field
            label="ZIP code"
            value="97204"
          ></s-text-field>
        </div>
        ${m('purchase.checkout.delivery-address.render-after')}
        <h3 class="pg-h3">Shipping method</h3>
        ${m('purchase.checkout.shipping-option-list.render-before')}
        <div class="pg-options">
          ${option(
            true,
            'Standard',
            '3 to 5 business days',
            '$5.00',
            m('purchase.checkout.shipping-option-item.render-after')
          )}
          ${
            target.endsWith('details.render')
              ? `<div class="pg-details">${m(target)}</div>`
              : ''
          }
          ${option(false, 'Express', '1 to 2 business days', '$15.00')}
        </div>
        ${m('purchase.checkout.shipping-option-list.render-after')}
      </section>
    `
  }

  const list = `purchase.checkout.pickup-${pickup}-list`
  const places =
    pickup === 'point'
      ? [
          ['Parcel locker · Pioneer Square', '0.4 mi · Open 24 hours'],
          ['Corner Market', '0.9 mi · Open until 9 pm'],
        ]
      : [
          [
            'Maple & Co. Downtown',
            '151 O’Connor Street · Usually ready in 2 hours',
          ],
          [
            'Maple & Co. Eastside',
            '48 Alder Avenue · Usually ready in 24 hours',
          ],
        ]

  return /* HTML */ `
    <section class="pg-sec">
      <s-heading>Delivery</s-heading>
      <div class="pg-options pg-tabs">
        ${option(false, 'Ship', '', '<s-icon type="truck"></s-icon>')}
        ${option(
          true,
          pickup === 'point' ? 'Pickup point' : 'Pick up',
          '',
          '<s-icon type="store"></s-icon>'
        )}
      </div>
      <h3 class="pg-h3">
        ${pickup === 'point' ? 'Pickup points' : 'Pickup locations'}
      </h3>
      ${m(`${list}.render-before`)}
      <div class="pg-options">
        ${option(
          true,
          places[0]![0]!,
          places[0]![1]!,
          'Free',
          m('purchase.checkout.pickup-location-option-item.render-after')
        )}
        ${option(false, places[1]![0]!, places[1]![1]!, 'Free')}
      </div>
      ${m(`${list}.render-after`)}
    </section>
  `
}

// Shared by checkout and the Thank you page: a full-width header, the form
// on the left and the order summary on the right (a toggle on small screens).
const purchase = (top: string, main: string, summary: string) => /* HTML */ `
  ${top}
  <div class="pg-co">
    <header class="pg-header">
      <div>
        <span class="pg-logo">Maple &amp; Co.</span>
        <s-icon
          type="bag"
          size="large"
        ></s-icon>
      </div>
    </header>
    <div class="pg-co-cols">
      <main class="pg-co-main"><div class="pg-col">${main}</div></main>
      <aside class="pg-co-summary">
        <details open>
          <summary>
            <span>
              Order summary
              <s-icon type="chevron-down"></s-icon>
            </span>
            <strong>$63.00</strong>
          </summary>
          <div class="pg-col">${summary}</div>
        </details>
      </aside>
    </div>
  </div>
`

const checkout = (target: string, m: Mount) =>
  purchase(
    '',
    /* HTML */ `
      ${m('purchase.checkout.header.render-after')}
      <section class="pg-express">
        <div class="pg-sub">Express checkout</div>
        <div class="pg-2">
          <span class="pg-wallet">Shop Pay</span>
          <span class="pg-wallet">G Pay</span>
        </div>
        <div class="pg-or"><span>OR</span></div>
      </section>
      <section class="pg-sec">
        <div class="pg-row">
          <s-heading>Contact</s-heading>
          <s-link>Sign in</s-link>
        </div>
        <s-text-field
          label="Email or mobile phone number"
          value="jane@example.com"
          icon="question-circle"
        ></s-text-field>
        <s-checkbox label="Email me with news and offers"></s-checkbox>
        ${m('purchase.checkout.contact.render-after')}
      </section>
      ${delivery(target, m)}
      <section class="pg-sec">
        <div>
          <s-heading>Payment</s-heading>
          <div class="pg-sub">All transactions are secure and encrypted.</div>
        </div>
        ${m('purchase.checkout.payment-method-list.render-before')}
        <div class="pg-options">
          ${option(
            true,
            'Credit card',
            '',
            '<s-payment-icon type="visa"></s-payment-icon> <s-payment-icon type="master"></s-payment-icon> <s-payment-icon type="amex"></s-payment-icon>'
          )}
          <div class="pg-details">
            <s-text-field
              label="Card number"
              icon="lock"
            ></s-text-field>
            <div class="pg-2">
              <s-text-field label="Expiration date (MM / YY)"></s-text-field>
              <s-text-field
                label="Security code"
                icon="question-circle"
              ></s-text-field>
            </div>
            <s-text-field
              label="Name on card"
              value="Jane Doe"
            ></s-text-field>
            <s-checkbox
              label="Use shipping address as billing address"
              checked
            ></s-checkbox>
          </div>
          ${option(false, 'PayPal', '', '')}
        </div>
        ${m('purchase.checkout.payment-method-list.render-after')}
      </section>
      ${m('purchase.checkout.block.render')}
      ${m('purchase.checkout.actions.render-before')}
      <s-button inlineSize="fill">Pay now</s-button>
      ${FOOTER} ${m('purchase.checkout.footer.render-after')}
    `,
    /* HTML */ `
      <div class="pg-lines">
        ${lines(m('purchase.checkout.cart-line-item.render-after'))}
      </div>
      ${m('purchase.checkout.cart-line-list.render-after')}
      ${m('purchase.checkout.reductions.render-before')}
      <div class="pg-discount">
        <s-text-field label="Discount code or gift card"></s-text-field>
        <span>Apply</span>
      </div>
      ${m('purchase.checkout.reductions.render-after')} ${TOTALS}
    `
  )

const info = (label: string, value: string) =>
  `<div><div class="pg-sub">${label}</div>${value}</div>`

const ADDRESS = 'Jane Doe<br />151 O’Connor Street<br />Portland OR 97204'

const thankYou = (_target: string, m: Mount) =>
  purchase(
    m('purchase.thank-you.announcement.render'),
    /* HTML */ `
      ${m('purchase.thank-you.header.render-after')}
      <div class="pg-confirm">
        <span>
          <s-icon
            type="check"
            size="large"
          ></s-icon>
        </span>
        <div>
          <div class="pg-sub">Confirmation #XK4R9T2LM</div>
          <s-heading>Thank you, Jane!</s-heading>
        </div>
      </div>
      ${m('purchase.thank-you.block.render')}
      <div class="pg-card pg-flush">
        <div class="pg-map">
          <span>
            <small>Shipping address</small>
            Portland, Oregon
          </span>
        </div>
        <div>
          <h3 class="pg-h3">Your order is confirmed</h3>
          You’ll receive a confirmation email with your order number shortly.
        </div>
      </div>
      <div class="pg-card">
        <h3 class="pg-h3">Order details</h3>
        <div class="pg-2">
          ${info('Contact information', 'jane@example.com')}
          ${info('Payment method', 'Visa •••• 4242 · $63.00')}
          ${info('Shipping address', ADDRESS)}
          ${info('Billing address', ADDRESS)}
          ${info('Shipping method', 'Standard')}
        </div>
      </div>
      ${m('purchase.thank-you.customer-information.render-after')}
      <div class="pg-row">
        <span>
          Need help?
          <s-link>Contact us</s-link>
        </span>
        <s-button>Continue shopping</s-button>
      </div>
      ${FOOTER} ${m('purchase.thank-you.footer.render-after')}
    `,
    /* HTML */ `
      <div class="pg-lines">
        ${lines(m('purchase.thank-you.cart-line-item.render-after'))}
      </div>
      ${m('purchase.thank-you.cart-line-list.render-after')} ${TOTALS}
    `
  )

// Customer accounts: the shop name and account controls on top, a short
// navigation list beside a single column of cards, and policy links below.
const account = (
  nav: string,
  body: string,
  m: Mount,
  wide = false
) => /* HTML */ `
  <div class="pg-ca">
    <header class="pg-ca-header">
      <span class="pg-logo">Maple &amp; Co.</span>
      <span class="pg-actions">
        ${
          nav === 'b2b'
            ? '<span class="pg-pill"><s-icon type="location"></s-icon>Portland warehouse</span>'
            : ''
        }
        <span class="pg-pill">$10.00</span>
        <s-avatar
          initials="JD"
          alt="Jane Doe"
        ></s-avatar>
      </span>
    </header>
    <div class="pg-ca-body">
      <nav>
        <span class="${nav === 'orders' ? 'on' : ''}">Orders</span>
        <span class="${nav === 'orders' ? '' : 'on'}">Profile</span>
      </nav>
      <main class="${wide ? '' : 'pg-narrow'}">${body}</main>
    </div>
    <footer class="pg-ca-footer">
      <span>Refund policy</span>
      <span>Privacy policy</span>
      <span>Terms of service</span>
    </footer>
    ${m('customer-account.footer.render-after')}
  </div>
`

const SECONDARY = 'variant="secondary"'

const order = (
  status: string,
  number: string,
  total: string,
  images: Array<string>,
  slot = ''
) => /* HTML */ `
  <div class="pg-card">
    <div class="pg-thumbs">${images.map(i => thumb(i)).join('')}</div>
    <div class="pg-row">
      <div>
        <strong class="pg-lead">${status}</strong>
        <div class="pg-sub">#${number} · ${total}</div>
      </div>
      <span class="pg-actions">
        ${slot}
        <s-button ${SECONDARY}>Buy again</s-button>
      </span>
    </div>
  </div>
`

const orderIndex = (target: string, m: Mount) =>
  account(
    'orders',
    /* HTML */ `
      ${m('customer-account.order-index.announcement.render')}
      ${m('customer-account.order-index.block.render')}
      <div class="pg-first">
        ${order(
          'On its way',
          '1042',
          '$63.00',
          ['teapot.jpg', 'bath.jpeg'],
          m('customer-account.order.action.menu-item.render')
        )}
      </div>
      ${order('Delivered Oct 28', '1037', '$24.00', ['garnished.jpeg'])}
      ${order('Delivered Sep 3', '1021', '$58.00', ['bath.jpeg', 'teapot.jpg'])}
      ${
        target === 'customer-account.order.action.render'
          ? `<div class="pg-modal"><div>${m(target)}</div></div>`
          : ''
      }
    `,
    m
  )

const row = (label: string, value: string) =>
  `<div><span class="pg-sub">${label}</span><span>${value}</span></div>`

const orderStatus = (target: string, m: Mount) =>
  account(
    'orders',
    /* HTML */ `
      ${m('customer-account.order-status.announcement.render')}
      <div class="pg-row">
        <div class="pg-back">
          <s-icon type="arrow-left"></s-icon>
          <div>
            <strong>Order #1042</strong>
            <div class="pg-sub">Nov 12</div>
          </div>
        </div>
        <span class="pg-actions">
          <s-button ${SECONDARY}>Buy again</s-button>
          <s-button ${SECONDARY}>Start return</s-button>
        </span>
      </div>
      ${m('customer-account.order-status.block.render')}
      <div class="pg-card">
        <div class="pg-thumbs">${thumb('teapot.jpg')}</div>
        <div class="pg-step">
          <s-icon type="check"></s-icon>
          <div>
            <strong>On its way</strong>
            <div class="pg-sub">
              Shipped with USPS · Tracking number 9400 1000 0000 0000
            </div>
            <div class="pg-sub">Nov 14</div>
          </div>
        </div>
        <div><s-button ${SECONDARY}>Track order with Shop</s-button></div>
      </div>
      ${m('customer-account.order-status.fulfillment-details.render-after')}
      ${
        target.includes('unfulfilled')
          ? /* HTML */ `
              <div class="pg-card">
                <div class="pg-thumbs">${thumb('garnished.jpeg')}</div>
                <div class="pg-step">
                  <s-icon type="clock"></s-icon>
                  <div>
                    <strong>Preparing for shipment</strong>
                    <div class="pg-sub">Recipe card set ships separately.</div>
                  </div>
                </div>
              </div>
            `
          : ''
      }
      ${m('customer-account.order-status.unfulfilled-items.render-after')}
      ${
        target.includes('return')
          ? /* HTML */ `
              <div class="pg-card">
                <div class="pg-thumbs">${thumb('bath.jpeg')}</div>
                <div class="pg-step">
                  <s-icon type="return"></s-icon>
                  <div>
                    <strong>Return in progress</strong>
                    <div class="pg-sub">
                      We emailed a prepaid label. Refund issued once the item
                      arrives.
                    </div>
                  </div>
                </div>
              </div>
            `
          : ''
      }
      ${m('customer-account.order-status.return-details.render-after')}
      <div class="pg-card">
        <div class="pg-lines">
          ${lines(
            m('customer-account.order-status.cart-line-item.render-after'),
            ''
          )}
        </div>
        ${m('customer-account.order-status.cart-line-list.render-after')}
        ${TOTALS}
      </div>
      <div class="pg-card pg-rows pg-kv">
        ${row('Contact', 'jane@example.com')} ${row('Ship to', ADDRESS)}
        ${row('Method', 'USPS Ground Advantage')}
        ${row(
          'Payment',
          'Visa · 4242 <s-payment-icon type="visa"></s-payment-icon><br />$63.00 · Nov 12'
        )}
      </div>
      ${m('customer-account.order-status.customer-information.render-after')}
      ${m('customer-account.order-status.payment-details.render-after')}
    `,
    m
  )

const head = (title: string, action = '') => /* HTML */ `
  <div class="pg-row pg-head">
    <strong>${title}</strong>
    ${action && `<s-button ${SECONDARY}>${action}</s-button>`}
  </div>
`

const place = (name: string, address: string) => /* HTML */ `
  <div>
    <span class="pg-tile"><s-icon type="location"></s-icon></span>
    <span class="pg-grow">
      ${name}
      <span>${address}</span>
    </span>
    <s-icon type="chevron-right"></s-icon>
  </div>
`

const cards = (slot = '') => /* HTML */ `
  ${head('Payment methods', 'Add')}
  <div class="pg-card pg-rows">
    <div>
      <s-payment-icon type="visa"></s-payment-icon>
      <span class="pg-grow">
        Visa
        <span>•••• 4242</span>
      </span>
      <s-icon type="chevron-right"></s-icon>
    </div>
    ${slot}
  </div>
`

const MARKETING = /* HTML */ `
  ${head('Marketing preferences')}
  <div class="pg-card pg-rows">
    <div>
      <s-icon type="email"></s-icon>
      <span class="pg-grow">Email</span>
      <s-switch
        accessibilityLabel="Email"
        checked
      ></s-switch>
    </div>
  </div>
`

const profile = (target: string, m: Mount) => {
  const b2b = target.includes('company')

  return account(
    b2b ? 'b2b' : 'profile',
    /* HTML */ `
      ${m('customer-account.profile.announcement.render')}
      ${m('customer-account.profile.block.render')} ${head('Jane Doe', 'Edit')}
      <div class="pg-card pg-rows">
        ${row('Email', 'jane@example.com')} ${row('Phone', '+1 503-555-0142')}
      </div>
      ${
        b2b
          ? /* HTML */ `
              ${MARKETING}
              <div class="pg-head">
                <strong class="pg-lead">Maple Wholesale Ltd.</strong>
                <div class="pg-sub">Portland warehouse</div>
              </div>
              ${m('customer-account.profile.company-details.render-after')}
              ${head('Shipping address')}
              <div class="pg-card pg-rows">
                ${place('Portland warehouse', '48 Alder Avenue Portland OR 97214')}
              </div>
              ${head('Billing address')}
              <div class="pg-card pg-rows">
                ${place('Portland warehouse', '48 Alder Avenue Portland OR 97214')}
              </div>
              ${m(
                'customer-account.profile.company-location-addresses.render-after'
              )}
              ${cards()}
              ${m(
                'customer-account.profile.company-location-payment.render-after'
              )}
              ${head('Staff')}
              <div class="pg-card pg-rows">
                ${row('Jane Doe', 'Location admin')}
                ${row('Sam Lee', 'Ordering only')}
              </div>
              ${m(
                'customer-account.profile.company-location-staff.render-after'
              )}
            `
          : /* HTML */ `
              ${head('Addresses', 'Add')}
              <div class="pg-card pg-rows">
                ${place('Jane Doe', '151 O’Connor Street Portland OR')}
                ${place('Jane Doe', '48 Alder Avenue Portland OR')}
                ${m('customer-account.profile.addresses.render-after')}
              </div>
              ${cards()} ${MARKETING}
              <div class="pg-actions pg-start">
                <s-button ${SECONDARY}>Sign out</s-button>
                <strong>Sign out of all devices</strong>
              </div>
            `
      }
    `,
    m
  )
}

const fullPage = (target: string, m: Mount) =>
  account(target.includes('order') ? 'orders' : '', m(target), m, true)

const screenFor = (target: string) =>
  target.startsWith('purchase.thank-you')
    ? thankYou
    : target.startsWith('purchase.')
      ? checkout
      : target.includes('.profile.')
        ? profile
        : target.includes('order-status')
          ? orderStatus
          : target.endsWith('page.render')
            ? fullPage
            : orderIndex

/** The mock page for `target`, with one `.pg-mount` where the extension renders. */
export function screenHTML(target: string) {
  // "Every line item" style targets repeat in Shopify; one mount is enough here.
  let mounted = false

  return screenFor(target)(target, id => {
    if (id !== target || mounted) {
      return ''
    }

    mounted = true

    return `<div class="pg-mount" data-target="${id}"></div>`
  })
}

export const SCREEN_CSS = `
:root { --pg-critical: #dd1d1d; --pg-success: #0a7c45; --pg-warning: #916a00; --pg-control-line: var(--pg-border);
  --pg-subdued: color-mix(in srgb, var(--pg-text) 56%, var(--pg-bg)); --pg-subdued-bg: color-mix(in srgb, var(--pg-text) 4%, var(--pg-bg));
  --pg-card-shadow: 0 0 0 .5px rgb(0 0 0 / .05), 0 1px 3px rgb(0 0 0 / .04), 0 2px 8px rgb(0 0 0 / .05); }
html, body { background: var(--pg-bg); }
body { padding-bottom: 0; font: var(--pg-fs)/1.35 var(--pg-font); color: var(--pg-text); -webkit-font-smoothing: antialiased; }
.pg-mount { position: relative; min-inline-size: 0; }
/* The margin keeps the target label below from covering what follows. */
body.pg-design .pg-mount { min-block-size: 44px; margin-block-end: 20px; border-radius: 4px; outline: 1px dashed rgb(47 91 255 / .55); outline-offset: 5px; }
body.pg-design .pg-mount:empty::before { content: 'Drop components here'; display: grid; place-items: center; min-block-size: 44px; color: #6b7280; font: 12px/1.4 system-ui, sans-serif; }
body.pg-design .pg-mount::after { content: attr(data-target); position: absolute; inset: 100% 0 auto auto; margin-block-start: 6px; padding: 0 6px; border-radius: 0 0 4px 4px;
  background: #2f5bff; color: #fff; font: 500 10px/16px ui-monospace, monospace; white-space: nowrap; pointer-events: none; }

.pg-logo { font: 600 var(--pg-fs-xl)/1.2 var(--pg-heading-font); }
.pg-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pg-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px; }
.pg-grow { flex: 1; min-inline-size: 0; }
.pg-sub { color: var(--pg-subdued); }
.pg-line .pg-sub, .pg-option .pg-sub, .pg-confirm .pg-sub { font-size: var(--pg-fs-small); }
.pg-h3 { margin: 0; font: 600 var(--pg-fs-large)/1.2 var(--pg-heading-font); }
.pg-lead, .pg-total { font-size: var(--pg-fs-lead); font-weight: 600; }
.pg-2, .pg-3 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.pg-3 { grid-template-columns: 1fr 1fr 1fr; }
.pg-card { display: flex; flex-direction: column; gap: 14px; padding: 16px; border-radius: var(--pg-r-large); background: var(--pg-bg); box-shadow: var(--pg-card-shadow), 0 0 0 1px color-mix(in srgb, var(--pg-border) 60%, transparent); }
.pg-lines { display: flex; flex-direction: column; gap: 16px; }
.pg-line { display: flex; align-items: center; gap: 14px; }
.pg-line > :last-child { align-self: flex-start; padding-block-start: 13px; }
.pg-totals { display: flex; flex-direction: column; gap: 6px; }
.pg-totals > div { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.pg-total { margin-block-start: 6px; }
.pg-total small { margin-inline-end: 4px; font-size: var(--pg-fs-small); font-weight: 400; color: var(--pg-subdued); }

.pg-co { display: flex; flex-direction: column; min-block-size: 100vh; }
.pg-header { border-block-end: 1px solid var(--pg-border); }
.pg-header > div { display: flex; align-items: center; justify-content: var(--pg-header-align); gap: 16px; box-sizing: border-box; max-inline-size: 1020px; min-block-size: 64px; margin-inline: auto; padding-inline: 20px; }
.pg-header s-icon { margin-inline-start: auto; color: var(--pg-accent); }
.pg-co-cols { flex: 1; display: grid; grid-template-columns: calc(50% + 50px) minmax(0, 1fr); }
.pg-co-main { display: flex; justify-content: flex-end; min-inline-size: 0; }
.pg-co-summary { min-inline-size: 0; background: var(--pg-summary); }
.pg-co-summary summary { display: none; }
.pg-col { display: flex; flex-direction: column; gap: 32px; box-sizing: border-box; inline-size: 100%; max-inline-size: 560px; padding: 40px 40px 40px 20px; }
.pg-co-summary .pg-col { position: sticky; inset-block-start: 0; max-inline-size: 460px; padding: 40px 20px 40px 40px; gap: 21px; }
.pg-sec, .pg-details, .pg-express { display: flex; flex-direction: column; gap: 10px; min-inline-size: 0; }
.pg-sec > :first-child { margin-block-end: 4px; }
.pg-sec s-heading, .pg-confirm s-heading { font-size: var(--pg-fs-xl); line-height: 1.2; }
.pg-sec > .pg-h3 { margin-block: 14px 4px; }
.pg-express { gap: 14px; text-align: center; }
.pg-wallet { display: grid; place-items: center; block-size: 48px; border-radius: var(--pg-r); background: #000; color: #fff; font-weight: 600; font-size: var(--pg-fs-large); }
.pg-wallet:first-child { background: #592ff4; }
.pg-or { display: flex; align-items: center; gap: 14px; color: var(--pg-subdued); }
.pg-or::before, .pg-or::after { content: ''; flex: 1; border-block-start: 1px solid var(--pg-border); }
.pg-options { border-radius: var(--pg-r); background: var(--pg-bg); box-shadow: inset 0 0 0 1px var(--pg-border); overflow: hidden; }
.pg-option, .pg-details { display: flex; gap: 12px; padding: 16px; }
.pg-option { align-items: flex-start; }
.pg-option + .pg-option, .pg-details, .pg-details + .pg-option { border-block-start: 1px solid var(--pg-border); }
.pg-option.on { background: color-mix(in srgb, var(--pg-accent) 5%, var(--pg-bg)); box-shadow: inset 0 0 0 1px var(--pg-accent); }
.pg-option:first-child { border-radius: var(--pg-r) var(--pg-r) 0 0; }
.pg-option:last-child { border-radius: 0 0 var(--pg-r) var(--pg-r); }
.pg-details { background: var(--pg-subdued-bg); }
.pg-radio { flex: none; box-sizing: border-box; inline-size: 18px; block-size: 18px; border-radius: 50%; background: var(--pg-bg); box-shadow: inset 0 0 0 1px var(--pg-control-line); }
.on > .pg-radio { box-shadow: inset 0 0 0 6px var(--pg-accent); }
.pg-tabs .pg-radio { display: none; }
.pg-footer { display: flex; flex-wrap: wrap; gap: 14px; margin-block-start: 28px; padding-block-start: 16px; border-block-start: 1px solid var(--pg-border); }
.pg-discount { position: relative; }
.pg-discount > span { position: absolute; inset: 7px 7px 7px auto; display: grid; place-items: center; padding-inline: 10px; border-radius: var(--pg-r-small);
  background: var(--pg-subdued-bg); box-shadow: inset 0 0 0 1px var(--pg-border); color: var(--pg-subdued); font-weight: 600; }
.pg-confirm { display: flex; align-items: center; gap: 14px; }
.pg-confirm > span { flex: none; display: grid; place-items: center; inline-size: 50px; aspect-ratio: 1; border: 2px solid var(--pg-accent); border-radius: 50%; color: var(--pg-accent); }
.pg-flush { padding: 0; gap: 0; overflow: hidden; }
.pg-flush > :last-child { display: flex; flex-direction: column; gap: 6px; padding: 16px; }
.pg-map { display: grid; place-items: center; block-size: 180px; background: repeating-linear-gradient(0deg, transparent 0 39px, rgb(0 0 0 / .05) 39px 40px), repeating-linear-gradient(90deg, transparent 0 39px, rgb(0 0 0 / .05) 39px 40px), #e8eef1; }
.pg-map > span { display: grid; justify-items: center; padding: 10px 24px; border-radius: var(--pg-r-small); background: var(--pg-bg); font-weight: 600; box-shadow: 0 2px 8px rgb(0 0 0 / .15); }
.pg-map small { font-size: var(--pg-fs); font-weight: 400; color: var(--pg-subdued); }

.pg-ca { box-sizing: border-box; display: flex; flex-direction: column; gap: 24px; max-inline-size: 1218px; min-block-size: 100vh; margin-inline: auto; padding: 20px 24px 28px; }
.pg-ca-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.pg-ca .pg-logo { font-size: var(--pg-fs-xxl); }
.pg-pill { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 99px; box-shadow: var(--pg-card-shadow), 0 0 0 1px color-mix(in srgb, var(--pg-border) 60%, transparent); font-weight: 600; }
.pg-ca-body { flex: 1; display: grid; grid-template-columns: 186px minmax(0, 1fr); align-items: start; }
.pg-ca-body > nav { display: flex; flex-direction: column; gap: 6px; font-size: var(--pg-fs-large); font-weight: 600; color: var(--pg-subdued); }
.pg-ca-body > nav > .on { color: var(--pg-text); }
.pg-ca-body > main { display: flex; flex-direction: column; gap: 16px; min-inline-size: 0; }
.pg-narrow { box-sizing: border-box; inline-size: 100%; max-inline-size: 600px; margin-inline: auto; }
.pg-ca-footer { display: flex; flex-wrap: wrap; gap: 12px; font-size: var(--pg-fs-small); color: var(--pg-subdued); }
.pg-thumbs { display: flex; flex-wrap: wrap; gap: 8px; }
.pg-card > .pg-row > :first-child { flex: none; }
.pg-ca s-product-thumbnail { inline-size: 56px; border-radius: var(--pg-r); box-shadow: none; }
.pg-first .pg-thumbs s-product-thumbnail { inline-size: 132px; }
.pg-back, .pg-step { display: flex; align-items: flex-start; gap: 10px; }
.pg-back > s-icon { margin-block-start: 1px; }
.pg-head { margin-block-start: 12px; }
.pg-start { justify-content: flex-start; gap: 20px; margin-block-start: 12px; }
.pg-rows { padding: 0; gap: 0; }
.pg-rows > * { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; }
.pg-rows > * + * { border-block-start: 1px solid color-mix(in srgb, var(--pg-border) 60%, transparent); }
.pg-rows .pg-grow > span { display: block; }
.pg-rows > div > s-icon:last-child { color: var(--pg-subdued); }
.pg-rows > .pg-mount { display: block; }
.pg-kv > div { display: grid; grid-template-columns: 76px minmax(0, 1fr); align-items: start; justify-content: start; }
.pg-tile { display: grid; place-items: center; inline-size: 40px; aspect-ratio: 1; border-radius: var(--pg-r-small); background: var(--pg-subdued-bg); }
.pg-modal { position: fixed; inset: 0; z-index: 5; display: grid; place-items: center; padding: 16px; background: rgb(0 0 0 / .5); backdrop-filter: blur(3px); }
.pg-modal > div { box-sizing: border-box; inline-size: min(480px, 100%); padding: 20px; border-radius: var(--pg-r-large); background: var(--pg-bg); box-shadow: 0 16px 48px rgb(0 0 0 / .25); }

@media (max-width: 750px) {
  .pg-co-cols { grid-template-columns: minmax(0, 1fr); align-content: start; }
  .pg-co-summary { order: -1; border-block-end: 1px solid var(--pg-border); }
  .pg-co-summary summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 20px 14px; list-style: none; color: var(--pg-accent); cursor: pointer; }
  .pg-co-summary summary::-webkit-details-marker { display: none; }
  .pg-co-summary summary strong { color: var(--pg-text); font-size: var(--pg-fs-lead); }
  .pg-co-main { justify-content: center; }
  .pg-col, .pg-co-summary .pg-col { position: static; max-inline-size: none; padding: 20px 14px; }
  .pg-co-summary .pg-col { padding-block-start: 0; }
  .pg-header > div { padding-inline: 14px; }
  .pg-sec .pg-2, .pg-3 { grid-template-columns: 1fr; }
  .pg-ca { padding-inline: 14px; }
  .pg-ca-body { grid-template-columns: minmax(0, 1fr); gap: 20px; }
  .pg-ca-body > nav { flex-direction: row; gap: 16px; }
  .pg-modal { place-items: end center; padding: 0; }
  .pg-modal > div { inline-size: 100%; border-radius: var(--pg-r-large) var(--pg-r-large) 0 0; }
}
`
