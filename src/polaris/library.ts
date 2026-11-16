import { isExtension, uid } from '../editor/model.ts'
import type { Version } from '../editor/model.ts'

// `ext*` apply on the checkout and customer account surfaces, where a few
// components are documented elsewhere or take different properties.
type Entry = {
  tag: string
  blurb: string
  docs: string | null
  preset?: string
  extDocs?: string
  extPreset?: string
  /** Only exists on the extension surfaces. */
  extension?: true
}

const IMG = 'https://cdn.shopify.com/static/sample-images'

/** Every surface's components; the palette shows the ones in the open catalog. */
export const PALETTE: Array<{ name: string; items: Array<Entry> }> = [
  {
    name: 'Layout',
    items: [
      {
        tag: 's-page',
        blurb: 'Outer wrapper with a title bar and page actions',
        docs: 'layout-and-structure/page',
        preset: /* HTML */ `
          <s-page heading="Page title"></s-page>
        `,
      },
      {
        tag: 's-section',
        blurb: 'Groups related content under an optional heading',
        docs: 'layout-and-structure/section',
        preset: /* HTML */ `
          <s-section heading="Section heading"></s-section>
        `,
      },
      {
        tag: 's-stack',
        blurb: 'Lays children out in a row or column with even gaps',
        docs: 'layout-and-structure/stack',
        preset: /* HTML */ `
          <s-stack gap="base"></s-stack>
        `,
      },
      {
        tag: 's-grid',
        blurb: 'Two-dimensional layout with explicit columns',
        docs: 'layout-and-structure/grid',
        preset: /* HTML */ `
          <s-grid
            gridTemplateColumns="1fr 1fr"
            gap="base"
          >
            <s-grid-item></s-grid-item>
            <s-grid-item></s-grid-item>
          </s-grid>
        `,
      },
      {
        tag: 's-grid-item',
        blurb: 'A cell in a grid that can span rows or columns',
        docs: 'layout-and-structure/grid',
      },
      {
        tag: 's-box',
        blurb: 'Generic container for padding, borders and backgrounds',
        docs: 'layout-and-structure/box',
        preset: /* HTML */ `
          <s-box
            padding="base"
            background="subdued"
            borderRadius="base"
          ></s-box>
        `,
      },
      {
        tag: 's-divider',
        blurb: 'A thin rule that separates content',
        docs: 'layout-and-structure/divider',
      },
      {
        tag: 's-query-container',
        blurb: 'Enables container queries for responsive props',
        docs: 'layout-and-structure/query-container',
      },
      {
        tag: 's-scroll-box',
        blurb: 'Scrollable region with a fixed size',
        docs: null,
        extDocs: 'layout-and-structure/scroll-box',
        preset: /* HTML */ `
          <s-scroll-box maxBlockSize="200px"></s-scroll-box>
        `,
      },
    ],
  },
  {
    name: 'Text',
    items: [
      {
        tag: 's-heading',
        blurb: 'Title for a page area, levelled automatically',
        docs: 'typography-and-content/heading',
        preset: /* HTML */ `
          <s-heading>Heading</s-heading>
        `,
      },
      {
        tag: 's-text',
        blurb: 'Inline text with tone and emphasis',
        docs: 'typography-and-content/text',
        preset: /* HTML */ `
          <s-text>Text</s-text>
        `,
      },
      {
        tag: 's-paragraph',
        blurb: 'A block of running text',
        docs: 'typography-and-content/paragraph',
        preset: /* HTML */ `
          <s-paragraph>
            Paragraphs hold longer explanations, like what a setting does or why
            a step matters.
          </s-paragraph>
        `,
      },
      {
        tag: 's-number',
        blurb: 'Numeric text with aligned figures',
        docs: 'typography-and-content/number',
        preset: /* HTML */ `
          <s-number>1,284</s-number>
        `,
      },
      {
        tag: 's-chip',
        blurb: 'Compact label for a tag or attribute',
        docs: 'typography-and-content/chip',
        preset: /* HTML */ `
          <s-chip>Chip</s-chip>
        `,
      },
      {
        tag: 's-unordered-list',
        blurb: 'Bulleted list',
        docs: 'layout-and-structure/unordered-list',
        extDocs: 'typography-and-content/unordered-list',
        preset: /* HTML */ `
          <s-unordered-list>
            <s-list-item>First point</s-list-item>
            <s-list-item>Second point</s-list-item>
          </s-unordered-list>
        `,
      },
      {
        tag: 's-ordered-list',
        blurb: 'Numbered list for sequential steps',
        docs: 'layout-and-structure/ordered-list',
        extDocs: 'typography-and-content/ordered-list',
        preset: /* HTML */ `
          <s-ordered-list>
            <s-list-item>First step</s-list-item>
            <s-list-item>Second step</s-list-item>
          </s-ordered-list>
        `,
      },
      {
        tag: 's-list-item',
        blurb: 'An entry in an ordered or unordered list',
        docs: 'layout-and-structure/unordered-list',
        extDocs: 'typography-and-content/unordered-list',
        preset: /* HTML */ `
          <s-list-item>List item</s-list-item>
        `,
      },
      {
        tag: 's-details',
        extension: true,
        blurb: 'Content that expands under a summary',
        docs: 'typography-and-content/details',
        preset: /* HTML */ `
          <s-details>
            <s-summary>Shipping details</s-summary>
            <s-paragraph>Orders ship within two business days.</s-paragraph>
          </s-details>
        `,
      },
      {
        tag: 's-summary',
        extension: true,
        blurb: 'The always-visible label of a details block',
        docs: 'typography-and-content/details',
        preset: /* HTML */ `
          <s-summary>Summary</s-summary>
        `,
      },
      {
        tag: 's-abbreviation',
        extension: true,
        blurb: 'Short form with its full meaning on hover',
        docs: 'typography-and-content/abbreviation',
        preset: /* HTML */ `
          <s-abbreviation title="United States dollar">USD</s-abbreviation>
        `,
      },
      {
        tag: 's-time',
        extension: true,
        blurb: 'A date or time that machines can read',
        docs: 'typography-and-content/time',
        preset: /* HTML */ `
          <s-time dateTime="2026-01-15">January 15, 2026</s-time>
        `,
      },
      {
        tag: 's-skeleton-paragraph',
        extension: true,
        blurb: 'Placeholder lines while text loads',
        docs: 'typography-and-content/skeleton-paragraph',
      },
    ],
  },
  {
    name: 'Actions',
    items: [
      {
        tag: 's-clipboard-item',
        extension: true,
        blurb: 'Copies text when its button is pressed',
        docs: 'actions/clipboard-item',
        preset: /* HTML */ `
          <s-button
            commandFor="copy-{id}"
            command="--copy"
            variant="secondary"
          >
            Copy code
          </s-button>
          <s-clipboard-item
            id="copy-{id}"
            text="WELCOME10"
          ></s-clipboard-item>
        `,
      },
      {
        tag: 's-customer-account-action',
        extension: true,
        blurb: 'Modal content for an order action',
        docs: 'actions/customer-account-action',
        preset: /* HTML */ `
          <s-customer-account-action heading="Report a problem">
            <s-text-area
              label="What went wrong?"
              rows="3"
            ></s-text-area>
            <s-button
              slot="primary-action"
              variant="primary"
            >
              Send
            </s-button>
            <s-button
              slot="secondary-actions"
              variant="secondary"
            >
              Cancel
            </s-button>
          </s-customer-account-action>
        `,
      },
      {
        tag: 's-button',
        blurb: 'Triggers an action or navigates',
        docs: 'actions/button',
        preset: /* HTML */ `
          <s-button>Button</s-button>
        `,
      },
      {
        tag: 's-button-group',
        blurb: 'Related buttons with a primary and secondary actions',
        docs: 'actions/button-group',
        preset: /* HTML */ `
          <s-button-group>
            <s-button
              slot="primary-action"
              variant="primary"
            >
              Save
            </s-button>
            <s-button slot="secondary-actions">Cancel</s-button>
          </s-button-group>
        `,
      },
      {
        tag: 's-link',
        blurb: 'Navigates to another page or site',
        docs: 'actions/link',
        preset: /* HTML */ `
          <s-link href="#">Link</s-link>
        `,
      },
      {
        tag: 's-clickable',
        blurb: 'Makes any area interactive without button styling',
        docs: 'actions/clickable',
        preset: /* HTML */ `
          <s-clickable
            padding="base"
            border="base"
            borderRadius="base"
          >
            <s-text>Clickable area</s-text>
          </s-clickable>
        `,
      },
      {
        tag: 's-clickable-chip',
        blurb: 'Chip that can be clicked or removed',
        docs: 'actions/clickable-chip',
        preset: /* HTML */ `
          <s-clickable-chip>Filter</s-clickable-chip>
        `,
      },
      {
        tag: 's-menu',
        blurb: 'List of actions opened from a button',
        docs: 'actions/menu',
        extPreset: /* HTML */ `
          <s-button
            commandFor="menu-{id}"
            variant="secondary"
          >
            Manage
          </s-button>
          <s-menu
            id="menu-{id}"
            accessibilityLabel="Order actions"
          >
            <s-button>Edit address</s-button>
            <s-button>Download invoice</s-button>
            <s-button tone="critical">Cancel order</s-button>
          </s-menu>
        `,
        preset: /* HTML */ `
          <s-button
            commandFor="menu-{id}"
            icon="menu-horizontal"
            accessibilityLabel="More actions"
          ></s-button>
          <s-menu
            id="menu-{id}"
            accessibilityLabel="More actions"
          >
            <s-button icon="edit">Edit</s-button>
            <s-button icon="duplicate">Duplicate</s-button>
            <s-button
              icon="delete"
              tone="critical"
            >
              Delete
            </s-button>
          </s-menu>
        `,
      },
      {
        tag: 's-press-button',
        blurb: 'Button that toggles between pressed and unpressed',
        docs: null,
        extDocs: 'actions/press-button',
        preset: /* HTML */ `
          <s-press-button>Toggle</s-press-button>
        `,
      },
    ],
  },
  {
    name: 'Forms',
    items: [
      {
        tag: 's-form',
        extension: true,
        blurb: 'Wraps fields so they submit together',
        docs: 'forms/form',
        preset: /* HTML */ `
          <s-form>
            <s-stack gap="base">
              <s-text-field
                label="Gift message"
                name="message"
              ></s-text-field>
              <s-button type="submit">Save</s-button>
            </s-stack>
          </s-form>
        `,
      },
      {
        tag: 's-phone-field',
        extension: true,
        blurb: 'Phone number input',
        docs: 'forms/phone-field',
        preset: /* HTML */ `
          <s-phone-field label="Phone"></s-phone-field>
        `,
      },
      {
        tag: 's-consent-checkbox',
        extension: true,
        blurb: 'Checkbox tied to a marketing consent policy',
        docs: 'forms/consent-checkbox',
        preset: /* HTML */ `
          <s-consent-checkbox
            policy="sms-marketing"
            label="Text me with news and offers"
          ></s-consent-checkbox>
        `,
      },
      {
        tag: 's-consent-phone-field',
        extension: true,
        blurb: 'Phone input tied to a marketing consent policy',
        docs: 'forms/consent-phone-field',
        preset: /* HTML */ `
          <s-consent-phone-field
            policy="sms-marketing"
            label="Mobile number"
          ></s-consent-phone-field>
        `,
      },
      {
        tag: 's-text-field',
        blurb: 'Single-line text input',
        docs: 'forms/text-field',
        preset: /* HTML */ `
          <s-text-field
            label="Label"
            placeholder="Placeholder"
          ></s-text-field>
        `,
      },
      {
        tag: 's-text-area',
        blurb: 'Multi-line text input',
        docs: 'forms/text-area',
        preset: /* HTML */ `
          <s-text-area
            label="Description"
            rows="3"
          ></s-text-area>
        `,
      },
      {
        tag: 's-number-field',
        blurb: 'Numeric input with steppers',
        docs: 'forms/number-field',
        preset: /* HTML */ `
          <s-number-field
            label="Quantity"
            min="0"
          ></s-number-field>
        `,
      },
      {
        tag: 's-money-field',
        blurb: 'Currency amount input',
        docs: 'forms/money-field',
        preset: /* HTML */ `
          <s-money-field label="Price"></s-money-field>
        `,
      },
      {
        tag: 's-email-field',
        blurb: 'Email address input',
        docs: 'forms/email-field',
        preset: /* HTML */ `
          <s-email-field
            label="Email"
            placeholder="you@example.com"
          ></s-email-field>
        `,
      },
      {
        tag: 's-password-field',
        blurb: 'Masked password input',
        docs: 'forms/password-field',
        preset: /* HTML */ `
          <s-password-field label="Password"></s-password-field>
        `,
      },
      {
        tag: 's-url-field',
        blurb: 'Web address input',
        docs: 'forms/url-field',
        extPreset: /* HTML */ `
          <s-url-field label="Website"></s-url-field>
        `,
        preset: /* HTML */ `
          <s-url-field
            label="Website"
            placeholder="https://"
          ></s-url-field>
        `,
      },
      {
        tag: 's-search-field',
        blurb: 'Search input for filtering content',
        docs: 'forms/search-field',
        preset: /* HTML */ `
          <s-search-field
            label="Search"
            labelAccessibilityVisibility="exclusive"
            placeholder="Search"
          ></s-search-field>
        `,
      },
      {
        tag: 's-select',
        blurb: 'Pick one option from a dropdown',
        docs: 'forms/select',
        preset: /* HTML */ `
          <s-select label="Select">
            <s-option value="1">Option 1</s-option>
            <s-option value="2">Option 2</s-option>
            <s-option value="3">Option 3</s-option>
          </s-select>
        `,
      },
      {
        tag: 's-option',
        blurb: 'An option inside a select',
        docs: 'forms/select',
        preset: /* HTML */ `
          <s-option value="option">Option</s-option>
        `,
      },
      {
        tag: 's-option-group',
        blurb: 'Labelled group of options inside a select',
        docs: 'forms/select',
        preset: /* HTML */ `
          <s-option-group label="Group">
            <s-option value="a">Option A</s-option>
            <s-option value="b">Option B</s-option>
          </s-option-group>
        `,
      },
      {
        tag: 's-checkbox',
        blurb: 'Toggle a single option on or off',
        docs: 'forms/checkbox',
        preset: /* HTML */ `
          <s-checkbox label="Checkbox"></s-checkbox>
        `,
      },
      {
        tag: 's-switch',
        blurb: 'Turn a setting on or off immediately',
        docs: 'forms/switch',
        preset: /* HTML */ `
          <s-switch label="Switch"></s-switch>
        `,
      },
      {
        tag: 's-choice-list',
        blurb: 'Radio buttons or checkboxes for a set of choices',
        docs: 'forms/choice-list',
        preset: /* HTML */ `
          <s-choice-list label="Choose one">
            <s-choice value="a">Choice A</s-choice>
            <s-choice value="b">Choice B</s-choice>
            <s-choice value="c">Choice C</s-choice>
          </s-choice-list>
        `,
      },
      {
        tag: 's-choice',
        blurb: 'A choice inside a choice list',
        docs: 'forms/choice-list',
        preset: /* HTML */ `
          <s-choice value="choice">Choice</s-choice>
        `,
      },
      {
        tag: 's-color-field',
        blurb: 'Hex color input with a swatch',
        docs: 'forms/color-field',
        preset: /* HTML */ `
          <s-color-field
            label="Color"
            value="#2c6ecb"
          ></s-color-field>
        `,
      },
      {
        tag: 's-color-picker',
        blurb: 'Visual color picker',
        docs: 'forms/color-picker',
        preset: /* HTML */ `
          <s-color-picker value="#2c6ecb"></s-color-picker>
        `,
      },
      {
        tag: 's-date-field',
        blurb: 'Date input with a calendar popover',
        docs: 'forms/date-field',
        preset: /* HTML */ `
          <s-date-field label="Date"></s-date-field>
        `,
      },
      {
        tag: 's-date-picker',
        blurb: 'Inline calendar for dates or ranges',
        docs: 'forms/date-picker',
      },
      {
        tag: 's-drop-zone',
        blurb: 'Drag-and-drop file upload area',
        docs: 'forms/drop-zone',
        preset: /* HTML */ `
          <s-drop-zone label="Upload files"></s-drop-zone>
        `,
      },
    ],
  },
  {
    name: 'Tables',
    items: [
      {
        tag: 's-table',
        blurb: 'Rows of data with headers, pagination and filters',
        docs: 'layout-and-structure/table',
        preset: /* HTML */ `
          <s-table>
            <s-table-header-row>
              <s-table-header listSlot="primary">Product</s-table-header>
              <s-table-header listSlot="inline">Status</s-table-header>
              <s-table-header
                listSlot="labeled"
                format="currency"
              >
                Price
              </s-table-header>
            </s-table-header-row>
            <s-table-body>
              <s-table-row>
                <s-table-cell>Ceramic teapot</s-table-cell>
                <s-table-cell>
                  <s-badge tone="success">Active</s-badge>
                </s-table-cell>
                <s-table-cell>$42.00</s-table-cell>
              </s-table-row>
              <s-table-row>
                <s-table-cell>Linen napkins</s-table-cell>
                <s-table-cell><s-badge>Draft</s-badge></s-table-cell>
                <s-table-cell>$18.00</s-table-cell>
              </s-table-row>
            </s-table-body>
          </s-table>
        `,
      },
      {
        tag: 's-table-header-row',
        blurb: 'The row of column headers',
        docs: 'layout-and-structure/table',
        preset: /* HTML */ `
          <s-table-header-row>
            <s-table-header>Column</s-table-header>
          </s-table-header-row>
        `,
      },
      {
        tag: 's-table-header',
        blurb: 'A column header',
        docs: 'layout-and-structure/table',
        preset: /* HTML */ `
          <s-table-header>Column</s-table-header>
        `,
      },
      {
        tag: 's-table-body',
        blurb: 'Holds the data rows',
        docs: 'layout-and-structure/table',
        preset: /* HTML */ `
          <s-table-body>
            <s-table-row><s-table-cell>Cell</s-table-cell></s-table-row>
          </s-table-body>
        `,
      },
      {
        tag: 's-table-row',
        blurb: 'A row of cells',
        docs: 'layout-and-structure/table',
        preset: /* HTML */ `
          <s-table-row>
            <s-table-cell>Cell</s-table-cell>
            <s-table-cell>Cell</s-table-cell>
          </s-table-row>
        `,
      },
      {
        tag: 's-table-cell',
        blurb: 'A single value in a row',
        docs: 'layout-and-structure/table',
        preset: /* HTML */ `
          <s-table-cell>Cell</s-table-cell>
        `,
      },
    ],
  },
  {
    name: 'Feedback',
    items: [
      {
        tag: 's-announcement',
        extension: true,
        blurb: 'Dismissible bar for a short, page-wide message',
        docs: 'feedback-and-status-indicators/announcement',
        preset: /* HTML */ `
          <s-announcement>
            Free shipping on orders over $50.
            <s-link href="#">See details</s-link>
          </s-announcement>
        `,
      },
      {
        tag: 's-badge',
        blurb: 'Short status label',
        docs: 'feedback-and-status-indicators/badge',
        preset: /* HTML */ `
          <s-badge>Badge</s-badge>
        `,
      },
      {
        tag: 's-banner',
        blurb: 'Prominent message about something important',
        docs: 'feedback-and-status-indicators/banner',
        preset: /* HTML */ `
          <s-banner
            heading="Heads up"
            tone="info"
          >
            Banners explain what changed and what to do next.
          </s-banner>
        `,
      },
      {
        tag: 's-empty-state',
        blurb: 'Explains an empty list and how to fill it',
        docs: 'feedback-and-status-indicators/empty-state',
        preset: /* HTML */ `
          <s-empty-state heading="No campaigns yet">
            <s-image
              slot="graphic"
              src="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              alt=""
            ></s-image>
            <s-text slot="subheading">
              Campaigns ask customers for a review after delivery.
            </s-text>
            <s-button
              slot="primary-action"
              variant="primary"
            >
              Create campaign
            </s-button>
          </s-empty-state>
        `,
      },
      {
        tag: 's-progress',
        blurb: 'How far a task has advanced',
        docs: 'feedback-and-status-indicators/progress',
        preset: /* HTML */ `
          <s-progress
            value="0.4"
            accessibilityLabel="Setup progress"
          ></s-progress>
        `,
      },
      {
        tag: 's-spinner',
        blurb: 'Indicates loading',
        docs: 'feedback-and-status-indicators/spinner',
        preset: /* HTML */ `
          <s-spinner accessibilityLabel="Loading"></s-spinner>
        `,
      },
    ],
  },
  {
    name: 'Media',
    items: [
      {
        tag: 's-product-thumbnail',
        extension: true,
        blurb: 'Product image with an optional quantity badge',
        docs: 'media-and-visuals/product-thumbnail',
        preset: /* HTML */ `
          <s-product-thumbnail
            src="${IMG}/teapot.jpg"
            alt="Ceramic teapot"
          ></s-product-thumbnail>
        `,
      },
      {
        tag: 's-image-group',
        extension: true,
        blurb: 'Up to four images in a compact grid',
        docs: 'media-and-visuals/image-group',
        preset: /* HTML */ `
          <s-image-group>
            <s-image
              src="${IMG}/teapot.jpg"
              alt="Ceramic teapot"
            ></s-image>
            <s-image
              src="${IMG}/bath.jpeg"
              alt="Bath salts"
            ></s-image>
            <s-image
              src="${IMG}/garnished.jpeg"
              alt="Recipe card set"
            ></s-image>
          </s-image-group>
        `,
      },
      {
        tag: 's-payment-icon',
        extension: true,
        blurb: 'Logo of a payment method',
        docs: 'media-and-visuals/payment-icon',
        preset: /* HTML */ `
          <s-payment-icon type="visa"></s-payment-icon>
        `,
      },
      {
        tag: 's-qr-code',
        extension: true,
        blurb: 'Scannable code for a link',
        docs: 'media-and-visuals/qr-code',
        preset: /* HTML */ `
          <s-qr-code content="https://shopify.com"></s-qr-code>
        `,
      },
      {
        tag: 's-map',
        extension: true,
        blurb: 'Interactive map with optional markers',
        docs: 'media-and-visuals/map',
        preset: /* HTML */ `
          <s-map
            latitude="45.5152"
            longitude="-122.6784"
            zoom="12"
            blockSize="240px"
            accessibilityLabel="Store location"
          >
            <s-map-marker
              latitude="45.5152"
              longitude="-122.6784"
            ></s-map-marker>
          </s-map>
        `,
      },
      {
        tag: 's-map-marker',
        extension: true,
        blurb: 'A pin on a map',
        docs: 'media-and-visuals/map',
        preset: /* HTML */ `
          <s-map-marker
            latitude="45.5152"
            longitude="-122.6784"
          ></s-map-marker>
        `,
      },
      {
        tag: 's-avatar',
        blurb: 'Picture or initials for a person or business',
        docs: 'media-and-visuals/avatar',
        preset: /* HTML */ `
          <s-avatar
            initials="JD"
            alt="Jane Doe"
          ></s-avatar>
        `,
      },
      {
        tag: 's-icon',
        blurb: 'A glyph from the Polaris icon set',
        docs: 'media-and-visuals/icon',
        preset: /* HTML */ `
          <s-icon type="star"></s-icon>
        `,
      },
      {
        tag: 's-image',
        blurb: 'Responsive image',
        docs: 'media-and-visuals/image',
        preset: /* HTML */ `
          <s-image
            src="${IMG}/garnished.jpeg"
            alt="Plated dish"
            aspectRatio="16/9"
            objectFit="cover"
            borderRadius="base"
          ></s-image>
        `,
      },
      {
        tag: 's-thumbnail',
        blurb: 'Small square preview of a product or file',
        docs: 'media-and-visuals/thumbnail',
        preset: /* HTML */ `
          <s-thumbnail
            src="${IMG}/teapot.jpg"
            alt="Teapot"
          ></s-thumbnail>
        `,
      },
    ],
  },
  {
    name: 'Overlays',
    items: [
      {
        tag: 's-sheet',
        extension: true,
        blurb: 'Panel that slides up over the page',
        docs: 'overlays/sheet',
        preset: /* HTML */ `
          <s-button commandFor="sheet-{id}">Open sheet</s-button>
          <s-sheet
            id="sheet-{id}"
            heading="Sheet title"
          >
            <s-paragraph>
              Sheets hold supporting detail without leaving the page.
            </s-paragraph>
          </s-sheet>
        `,
      },
      {
        tag: 's-modal',
        blurb: 'Dialog for focused tasks, opened from a button',
        docs: 'overlays/modal',
        preset: /* HTML */ `
          <s-button commandFor="modal-{id}">Open modal</s-button>
          <s-modal
            id="modal-{id}"
            heading="Modal title"
          >
            <s-paragraph>
              Modals interrupt the page, so keep their task short.
            </s-paragraph>
            <s-button
              slot="primary-action"
              variant="primary"
            >
              Confirm
            </s-button>
            <s-button
              slot="secondary-actions"
              commandFor="modal-{id}"
              command="--hide"
            >
              Cancel
            </s-button>
          </s-modal>
        `,
      },
      {
        tag: 's-popover',
        blurb: 'Floating panel anchored to a button',
        docs: 'overlays/popover',
        preset: /* HTML */ `
          <s-button commandFor="popover-{id}">Open popover</s-button>
          <s-popover id="popover-{id}">
            <s-box padding="base">
              <s-paragraph>Popover content</s-paragraph>
            </s-box>
          </s-popover>
        `,
      },
      {
        tag: 's-tooltip',
        blurb: 'Hint shown on hover or focus',
        docs: 'typography-and-content/tooltip',
        extDocs: 'overlays/tooltip',
        extPreset: /* HTML */ `
          <s-clickable interestFor="tooltip-{id}">
            <s-icon type="info"></s-icon>
          </s-clickable>
          <s-tooltip id="tooltip-{id}">Helpful context</s-tooltip>
        `,
        preset: /* HTML */ `
          <s-icon
            type="info"
            interestFor="tooltip-{id}"
          ></s-icon>
          <s-tooltip id="tooltip-{id}">Helpful context</s-tooltip>
        `,
      },
    ],
  },
]

/** The App Home components. */
export const CATEGORIES = PALETTE.map(c => ({
  ...c,
  items: c.items.filter(i => !i.extension),
}))

const ENTRIES = new Map(
  PALETTE.flatMap(c => c.items.map(i => [i.tag, { ...i, category: c.name }]))
)

export const entryFor = (tag: string) => ENTRIES.get(tag)

const DOCS_API: Record<Version, string> = {
  v1: 'app-home/v1.1',
  v2: 'app-home/latest',
  checkout: 'checkout-ui-extensions/latest',
  'customer-account': 'customer-account-ui-extensions/latest',
}

export function docsUrl(tag: string, version: Version) {
  const entry = ENTRIES.get(tag)
  const path = (isExtension(version) && entry?.extDocs) || entry?.docs

  if (!path) {
    return null
  }

  return `https://shopify.dev/docs/api/${DOCS_API[version]}/web-components/${path}`
}

export function presetFor(tag: string, version: Version = 'v2') {
  const entry = ENTRIES.get(tag)
  const preset =
    (isExtension(version) && entry?.extPreset) ||
    entry?.preset ||
    `<${tag}></${tag}>`

  return preset.replaceAll('{id}', uid())
}

type Template = {
  id: string
  name: string
  blurb: string
  description: string
  html: string
  /** Extension target the starter is meant for. */
  target?: string
}

const EXTENSION_TEMPLATES: Array<Template> = [
  {
    id: 'blank',
    name: 'Blank',
    blurb: 'An empty extension to build from scratch',
    description: 'An extension with no components.',
    html: '',
  },
  {
    id: 'notice',
    name: 'Notice',
    blurb: 'A banner with a short message',
    description: 'An info banner with a heading, a message and a link.',
    html: /* HTML */ `
      <s-banner
        heading="Free returns for 30 days"
        tone="info"
      >
        Changed your mind? Send it back at no cost.
        <s-link href="#">Read the policy</s-link>
      </s-banner>
    `,
  },
  {
    id: 'offer',
    name: 'Product offer',
    blurb: 'An add-on with a button',
    description:
      'A bordered offer with a product thumbnail, name, price and an Add button.',
    html: /* HTML */ `
      <s-stack gap="base">
        <s-heading>You might also like</s-heading>
        <s-grid
          gridTemplateColumns="auto 1fr auto"
          gap="base"
          alignItems="center"
          padding="base"
          border="base"
          borderRadius="base"
        >
          <s-product-thumbnail
            src="${IMG}/garnished.jpeg"
            alt="Recipe card set"
          ></s-product-thumbnail>
          <s-stack gap="small-400">
            <s-text type="strong">Recipe card set</s-text>
            <s-text color="subdued">$24.00</s-text>
          </s-stack>
          <s-button variant="secondary">Add</s-button>
        </s-grid>
      </s-stack>
    `,
  },
  {
    id: 'field',
    name: 'Custom field',
    blurb: 'Collect an extra detail',
    description:
      'A heading, a text area for delivery instructions and a consent checkbox.',
    html: /* HTML */ `
      <s-stack gap="base">
        <s-heading>Delivery instructions</s-heading>
        <s-text-area
          label="Notes for the courier"
          name="instructions"
          rows="3"
        ></s-text-area>
        <s-checkbox
          label="Leave the parcel with a neighbor if I'm out"
          name="neighbor"
        ></s-checkbox>
      </s-stack>
    `,
  },
  {
    id: 'page',
    name: 'Full page',
    blurb: 'A new page in customer accounts',
    description:
      'A full customer account page with a heading, a primary action and two sections.',
    target: 'customer-account.page.render',
    html: /* HTML */ `
      <s-page
        heading="{name}"
        subheading="Earn points on every order"
      >
        <s-button
          slot="primary-action"
          variant="primary"
        >
          Redeem points
        </s-button>
        <s-section heading="Your balance">
          <s-stack gap="small">
            <s-heading>1,240 points</s-heading>
            <s-progress value="0.62"></s-progress>
            <s-text color="subdued">760 points to your next reward</s-text>
          </s-stack>
        </s-section>
        <s-section heading="Recent activity">
          <s-stack gap="small">
            <s-text>Order #1042 · +63 points</s-text>
            <s-text>Order #1037 · +24 points</s-text>
          </s-stack>
        </s-section>
      </s-page>
    `,
  },
]

/** Starters that fit the surface. */
export const templatesFor = (version: Version) =>
  !isExtension(version)
    ? TEMPLATES
    : EXTENSION_TEMPLATES.filter(t => !t.target || t.target.startsWith(version))

export const TEMPLATES: Array<Template> = [
  {
    id: 'blank',
    name: 'Blank',
    blurb: 'An empty page to build from scratch',
    description: 'An empty page with only the page frame.',
    html: /* HTML */ `
      <s-page heading="{name}"></s-page>
    `,
  },
  {
    id: 'home',
    name: 'Home',
    blurb: 'Setup guide and headline metrics',
    description:
      'An app home page with a primary action, an info banner, a setup checklist with a progress bar, and three metric cards in a grid.',
    html: /* HTML */ `
      <s-page heading="{name}">
        <s-button
          slot="primary-action"
          variant="primary"
        >
          Create campaign
        </s-button>
        <s-banner
          tone="info"
          heading="Review requests are paused"
          dismissible
        >
          Turn them back on in settings to keep collecting reviews.
        </s-banner>
        <s-section heading="Setup guide">
          <s-stack gap="base">
            <s-progress
              value="0.33"
              accessibilityLabel="Setup progress"
            ></s-progress>
            <s-checkbox
              label="Install the review widget"
              checked
            ></s-checkbox>
            <s-checkbox label="Customize the request email"></s-checkbox>
            <s-checkbox label="Send your first request"></s-checkbox>
          </s-stack>
        </s-section>
        <s-section heading="Last 30 days">
          <s-grid
            gridTemplateColumns="1fr 1fr 1fr"
            gap="base"
          >
            <s-box
              padding="base"
              border="base"
              borderRadius="base"
            >
              <s-stack gap="small-200">
                <s-text color="subdued">Reviews collected</s-text>
                <s-heading>1,284</s-heading>
                <s-badge
                  tone="success"
                  icon="arrow-up"
                >
                  12%
                </s-badge>
              </s-stack>
            </s-box>
            <s-box
              padding="base"
              border="base"
              borderRadius="base"
            >
              <s-stack gap="small-200">
                <s-text color="subdued">Average rating</s-text>
                <s-heading>4.7</s-heading>
                <s-badge icon="star">Steady</s-badge>
              </s-stack>
            </s-box>
            <s-box
              padding="base"
              border="base"
              borderRadius="base"
            >
              <s-stack gap="small-200">
                <s-text color="subdued">Response rate</s-text>
                <s-heading>38%</s-heading>
                <s-badge
                  tone="warning"
                  icon="arrow-down"
                >
                  4%
                </s-badge>
              </s-stack>
            </s-box>
          </s-grid>
        </s-section>
      </s-page>
    `,
  },
  {
    id: 'index',
    name: 'Index',
    blurb: 'A searchable table of resources',
    description:
      'A wide resource list with primary and secondary page actions and a data table: search filter, product thumbnails, status badges, inventory and price columns.',
    html: /* HTML */ `
      <s-page
        heading="{name}"
        inlineSize="large"
      >
        <s-button
          slot="primary-action"
          variant="primary"
        >
          Add product
        </s-button>
        <s-button slot="secondary-actions">Export</s-button>
        <s-section padding="none">
          <s-table>
            <s-search-field
              slot="filters"
              label="Search products"
              labelAccessibilityVisibility="exclusive"
              placeholder="Search products"
            ></s-search-field>
            <s-table-header-row>
              <s-table-header listSlot="primary">Product</s-table-header>
              <s-table-header listSlot="inline">Status</s-table-header>
              <s-table-header
                listSlot="labeled"
                format="numeric"
              >
                Inventory
              </s-table-header>
              <s-table-header
                listSlot="labeled"
                format="currency"
              >
                Price
              </s-table-header>
            </s-table-header-row>
            <s-table-body>
              <s-table-row>
                <s-table-cell>
                  <s-stack
                    direction="inline"
                    gap="small"
                    alignItems="center"
                  >
                    <s-thumbnail
                      src="${IMG}/teapot.jpg"
                      alt="Ceramic teapot"
                      size="small"
                    ></s-thumbnail>
                    <s-link href="#">Ceramic teapot</s-link>
                  </s-stack>
                </s-table-cell>
                <s-table-cell>
                  <s-badge tone="success">Active</s-badge>
                </s-table-cell>
                <s-table-cell>48</s-table-cell>
                <s-table-cell>$42.00</s-table-cell>
              </s-table-row>
              <s-table-row>
                <s-table-cell>
                  <s-stack
                    direction="inline"
                    gap="small"
                    alignItems="center"
                  >
                    <s-thumbnail
                      src="${IMG}/bath.jpeg"
                      alt="Bath salts"
                      size="small"
                    ></s-thumbnail>
                    <s-link href="#">Lavender bath salts</s-link>
                  </s-stack>
                </s-table-cell>
                <s-table-cell>
                  <s-badge tone="success">Active</s-badge>
                </s-table-cell>
                <s-table-cell>112</s-table-cell>
                <s-table-cell>$16.00</s-table-cell>
              </s-table-row>
              <s-table-row>
                <s-table-cell>
                  <s-stack
                    direction="inline"
                    gap="small"
                    alignItems="center"
                  >
                    <s-thumbnail
                      src="${IMG}/garnished.jpeg"
                      alt="Recipe card set"
                      size="small"
                    ></s-thumbnail>
                    <s-link href="#">Recipe card set</s-link>
                  </s-stack>
                </s-table-cell>
                <s-table-cell><s-badge>Draft</s-badge></s-table-cell>
                <s-table-cell>0</s-table-cell>
                <s-table-cell>$24.00</s-table-cell>
              </s-table-row>
            </s-table-body>
          </s-table>
        </s-section>
      </s-page>
    `,
  },
  {
    id: 'details',
    name: 'Details',
    blurb: 'Edit one resource with a sidebar',
    description:
      'An edit page with a breadcrumb, Save and Duplicate actions, title and description fields, a pricing grid of money fields, and an aside with status and organization sections.',
    html: /* HTML */ `
      <s-page heading="{name}">
        <s-link
          slot="breadcrumb-actions"
          href="#"
        >
          Products
        </s-link>
        <s-button slot="secondary-actions">Duplicate</s-button>
        <s-button
          slot="primary-action"
          variant="primary"
        >
          Save
        </s-button>
        <s-section>
          <s-stack gap="base">
            <s-text-field
              label="Title"
              name="title"
              value="Ceramic teapot"
            ></s-text-field>
            <s-text-area
              label="Description"
              name="description"
              rows="4"
              value="Hand-thrown stoneware that keeps tea warm for an hour."
            ></s-text-area>
          </s-stack>
        </s-section>
        <s-section heading="Pricing">
          <s-grid
            gridTemplateColumns="1fr 1fr"
            gap="base"
          >
            <s-money-field
              label="Price"
              name="price"
              value="42.00"
            ></s-money-field>
            <s-money-field
              label="Compare-at price"
              name="compareAt"
              value="55.00"
            ></s-money-field>
          </s-grid>
        </s-section>
        <s-section
          slot="aside"
          heading="Status"
        >
          <s-select
            label="Status"
            name="status"
            labelAccessibilityVisibility="exclusive"
          >
            <s-option
              value="active"
              selected
            >
              Active
            </s-option>
            <s-option value="draft">Draft</s-option>
          </s-select>
        </s-section>
        <s-section
          slot="aside"
          heading="Organization"
        >
          <s-stack gap="base">
            <s-text-field
              label="Vendor"
              name="vendor"
              value="Maple Pottery"
            ></s-text-field>
            <s-stack
              direction="inline"
              gap="small-200"
            >
              <s-chip>Kitchen</s-chip>
              <s-chip>Ceramics</s-chip>
            </s-stack>
          </s-stack>
        </s-section>
      </s-page>
    `,
  },
  {
    id: 'settings',
    name: 'Settings',
    blurb: 'Grouped preferences with a save action',
    description:
      'A narrow settings page with store details, a timezone select, notification switches, and a critical delete action.',
    html: /* HTML */ `
      <s-page
        heading="{name}"
        inlineSize="small"
      >
        <s-button
          slot="primary-action"
          variant="primary"
        >
          Save
        </s-button>
        <s-section heading="Store details">
          <s-stack gap="base">
            <s-text-field
              label="Store name"
              name="storeName"
              value="Maple &amp; Co."
            ></s-text-field>
            <s-email-field
              label="Contact email"
              name="email"
              value="hello@maple.co"
              details="Customers see this address on receipts"
            ></s-email-field>
            <s-select
              label="Timezone"
              name="timezone"
            >
              <s-option
                value="est"
                selected
              >
                (GMT-05:00) Eastern Time
              </s-option>
              <s-option value="cst">(GMT-06:00) Central Time</s-option>
              <s-option value="pst">(GMT-08:00) Pacific Time</s-option>
            </s-select>
          </s-stack>
        </s-section>
        <s-section heading="Notifications">
          <s-stack gap="base">
            <s-switch
              label="Email me when an order is placed"
              name="orderEmails"
              checked
            ></s-switch>
            <s-switch
              label="Send a weekly summary"
              name="weeklySummary"
            ></s-switch>
          </s-stack>
        </s-section>
        <s-section heading="Delete data">
          <s-stack gap="base">
            <s-paragraph>
              Removes every review and campaign. This can't be undone.
            </s-paragraph>
            <s-button tone="critical">Delete all data</s-button>
          </s-stack>
        </s-section>
      </s-page>
    `,
  },
  {
    id: 'empty',
    name: 'Empty state',
    blurb: 'First-run page that asks for one action',
    description:
      'A first-run page with an illustration, a subheading, and primary and secondary actions.',
    html: /* HTML */ `
      <s-page heading="{name}">
        <s-section>
          <s-empty-state heading="Start your first campaign">
            <s-image
              slot="graphic"
              src="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              alt=""
            ></s-image>
            <s-text slot="subheading">
              Campaigns send review requests to customers once their order
              arrives.
            </s-text>
            <s-button
              slot="primary-action"
              variant="primary"
            >
              Create campaign
            </s-button>
            <s-button slot="secondary-actions">Learn more</s-button>
          </s-empty-state>
        </s-section>
      </s-page>
    `,
  },
]
