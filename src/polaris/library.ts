import { uid } from '../editor/model.ts'
import type { Version } from '../editor/model.ts'

type Entry = {
  tag: string
  blurb: string
  docs: string | null
  preset?: string
}

const IMG = 'https://cdn.shopify.com/static/sample-images'

export const CATEGORIES: Array<{ name: string; items: Array<Entry> }> = [
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
        preset: /* HTML */ `
          <s-list-item>List item</s-list-item>
        `,
      },
    ],
  },
  {
    name: 'Actions',
    items: [
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

const ENTRIES = new Map(
  CATEGORIES.flatMap(c => c.items.map(i => [i.tag, { ...i, category: c.name }]))
)

export const entryFor = (tag: string) => ENTRIES.get(tag)

export function docsUrl(tag: string, version: Version) {
  const path = ENTRIES.get(tag)?.docs

  if (!path) {
    return null
  }

  return `https://shopify.dev/docs/api/app-home/${version === 'v1' ? 'v1.1' : 'v2.0-rc'}/web-components/${path}`
}

export function presetFor(tag: string) {
  const id = uid()

  return (ENTRIES.get(tag)?.preset ?? `<${tag}></${tag}>`).replaceAll(
    '{id}',
    id
  )
}

export const TEMPLATES: Array<{
  id: string
  name: string
  blurb: string
  html: string
}> = [
  {
    id: 'blank',
    name: 'Blank',
    blurb: 'An empty page to build from scratch',
    html: /* HTML */ `
      <s-page heading="{name}"></s-page>
    `,
  },
  {
    id: 'home',
    name: 'Home',
    blurb: 'Setup guide and headline metrics',
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
