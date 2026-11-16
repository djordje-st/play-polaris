import type { Page, Version } from '../editor/model.ts'

// Kept apart from surfaces.ts so choosing a target doesn't load the mock pages.

export type Surface = 'checkout' | 'customer-account'

/** Documented render targets; block targets come first as the default. */
export const TARGETS: Record<
  Surface,
  Array<{ group: string; targets: Array<string> }>
> = {
  checkout: [
    { group: 'Block', targets: ['purchase.checkout.block.render'] },
    { group: 'Header', targets: ['purchase.checkout.header.render-after'] },
    {
      group: 'Information',
      targets: ['purchase.checkout.contact.render-after'],
    },
    {
      group: 'Shipping',
      targets: [
        'purchase.checkout.delivery-address.render-before',
        'purchase.checkout.delivery-address.render-after',
        'purchase.checkout.shipping-option-list.render-before',
        'purchase.checkout.shipping-option-list.render-after',
        'purchase.checkout.shipping-option-item.render-after',
        'purchase.checkout.shipping-option-item.details.render',
      ],
    },
    {
      group: 'Local pickup',
      targets: [
        'purchase.checkout.pickup-location-list.render-before',
        'purchase.checkout.pickup-location-list.render-after',
        'purchase.checkout.pickup-location-option-item.render-after',
      ],
    },
    {
      group: 'Pickup points',
      targets: [
        'purchase.checkout.pickup-point-list.render-before',
        'purchase.checkout.pickup-point-list.render-after',
      ],
    },
    {
      group: 'Payments',
      targets: [
        'purchase.checkout.payment-method-list.render-before',
        'purchase.checkout.payment-method-list.render-after',
      ],
    },
    {
      group: 'Navigation',
      targets: ['purchase.checkout.actions.render-before'],
    },
    {
      group: 'Order summary',
      targets: [
        'purchase.checkout.cart-line-item.render-after',
        'purchase.checkout.cart-line-list.render-after',
        'purchase.checkout.reductions.render-before',
        'purchase.checkout.reductions.render-after',
      ],
    },
    { group: 'Footer', targets: ['purchase.checkout.footer.render-after'] },
    {
      group: 'Thank you page',
      targets: [
        'purchase.thank-you.block.render',
        'purchase.thank-you.announcement.render',
        'purchase.thank-you.header.render-after',
        'purchase.thank-you.customer-information.render-after',
        'purchase.thank-you.cart-line-item.render-after',
        'purchase.thank-you.cart-line-list.render-after',
        'purchase.thank-you.footer.render-after',
      ],
    },
  ],
  'customer-account': [
    {
      group: 'Order status',
      targets: [
        'customer-account.order-status.block.render',
        'customer-account.order-status.announcement.render',
        'customer-account.order-status.fulfillment-details.render-after',
        'customer-account.order-status.unfulfilled-items.render-after',
        'customer-account.order-status.return-details.render-after',
        'customer-account.order-status.customer-information.render-after',
        'customer-account.order-status.payment-details.render-after',
        'customer-account.order-status.cart-line-item.render-after',
        'customer-account.order-status.cart-line-list.render-after',
      ],
    },
    {
      group: 'Order index',
      targets: [
        'customer-account.order-index.block.render',
        'customer-account.order-index.announcement.render',
      ],
    },
    {
      group: 'Order actions',
      targets: [
        'customer-account.order.action.menu-item.render',
        'customer-account.order.action.render',
      ],
    },
    {
      group: 'Profile',
      targets: [
        'customer-account.profile.block.render',
        'customer-account.profile.announcement.render',
        'customer-account.profile.addresses.render-after',
      ],
    },
    {
      group: 'Profile (B2B)',
      targets: [
        'customer-account.profile.company-details.render-after',
        'customer-account.profile.company-location-addresses.render-after',
        'customer-account.profile.company-location-payment.render-after',
        'customer-account.profile.company-location-staff.render-after',
      ],
    },
    {
      group: 'Full page',
      targets: [
        'customer-account.page.render',
        'customer-account.order.page.render',
      ],
    },
    { group: 'Footer', targets: ['customer-account.footer.render-after'] },
  ],
}

export const targetsOf = (surface: Surface) =>
  TARGETS[surface].flatMap(g => g.targets)

/** The page's target when it belongs to this surface, else the surface default. */
export const targetOf = (page: Pick<Page, 'target'>, version: Version) => {
  const all = targetsOf(version as Surface)

  return page.target && all.includes(page.target) ? page.target : all[0]!
}
