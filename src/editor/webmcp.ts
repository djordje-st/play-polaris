import { CATEGORIES, docsUrl, entryFor } from '../polaris/library'
import { RULES, describeSlot, placementError, validate } from '../polaris/rules'
import { exportPage, toHTML } from './codegen'
import { isText, locate, slotOf, textOf, walk } from './model'
import { inspectPreview, screenshotPreview } from './preview'
import {
  addPage,
  canEdit,
  canUndo,
  canRedo,
  catalog,
  currentPage,
  deletePage,
  duplicate,
  duplicatePage,
  editor,
  fromTemplate,
  insertAt,
  logAgent,
  move,
  openPage,
  parse,
  remove,
  renamePage,
  replacePage,
  redo,
  savePreset,
  select,
  setAttr,
  setText,
  setMode,
  setViewport,
  setVersion,
  undo,
  uniquePageName,
} from './store'
import type { TreeNode } from './model'

// Support document.modelContext and the navigator.modelContext used by earlier builds and polyfills.

type JSONSchema = Record<string, unknown>

type ToolResult = {
  content: [
    { type: 'text'; text: string },
    ...Array<{ type: 'image'; data: string; mimeType: 'image/png' }>,
  ]
  isError?: boolean
}

type ToolDef = {
  name: string
  title?: string
  description: string
  inputSchema: JSONSchema
  annotations?: { readOnlyHint?: boolean; consequentialHint?: boolean }
  execute: (input: Record<string, unknown> | undefined) => Promise<ToolResult>
}

type ModelContext = {
  registerTool: (tool: ToolDef, options?: { signal?: AbortSignal }) => unknown
  unregisterTool?: (name: string) => void
}

declare global {
  interface Document {
    modelContext?: ModelContext
  }

  interface Navigator {
    modelContext?: ModelContext
  }
}

class ToolError extends Error {}

function fail(message: string): never {
  throw new ToolError(message)
}

const str = (v: unknown, name: string) =>
  typeof v === 'string' && v ? v : fail(`“${name}” must be a non-empty string`)

const optStr = (v: unknown, name: string) =>
  v === undefined ? undefined : str(v, name)

/** Agents edit what the user is looking at, so targeting a page opens it. */
function page(pageId: unknown) {
  if (pageId !== undefined) {
    const id = str(pageId, 'pageId')

    if (!editor.state.doc.pages.some(p => p.id === id)) {
      fail(`No page with id “${id}”. Call get_workspace for page ids.`)
    }

    openPage(id)
  }

  return currentPage()
}

const compact = (n: TreeNode): unknown =>
  isText(n)
    ? { id: n.id, text: n.text }
    : {
        id: n.id,
        tag: n.tag,
        ...(Object.keys(n.attrs).length ? { attrs: n.attrs } : {}),
        ...(n.children.length ? { children: n.children.map(compact) } : {}),
      }

const PAGE_ID = {
  type: 'string',
  description: 'Page id from get_workspace. Defaults to the open page.',
}

const TOOLS: Array<
  Omit<ToolDef, 'execute'> & {
    run: (input: Record<string, unknown>) => unknown
    summary?: (input: Record<string, unknown>) => string
  }
> = [
  {
    name: 'get_workspace',
    title: 'Get workspace',
    description:
      'Overview of PlayPolaris: the Polaris web components version being previewed, every page with its id, the open page and the selected component. Start here.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    run: () => {
      const s = editor.state

      return {
        polarisVersion:
          s.doc.version === 'v1'
            ? 'v1 (polaris-1.js)'
            : 'v2 release candidate (polaris-2.0-rc.js)',
        pages: s.doc.pages.map(p => ({
          id: p.id,
          name: p.name,
          componentCount: countElements(p.nodes),
        })),
        openPageId: s.pageId,
        selectedId: s.selectedId,
        viewport: s.viewport,
        mode: s.mode,
        canUndo: canUndo(s),
        canRedo: canRedo(s),
        tips: [
          'Build UI by passing Polaris web component HTML (s-* tags) to insert_html or set_page_html.',
          'Use camelCase attribute names as in Shopify docs, e.g. gridTemplateColumns, labelAccessibilityVisibility.',
          'Call get_component before using a component you are unsure about, and validate_page after edits.',
          'Use set_preview and inspect_preview to check layouts; screenshot_preview returns PNG image content for visual review.',
        ],
      }
    },
  },
  {
    name: 'set_preview',
    title: 'Set preview',
    description:
      'Sets desktop/tablet/mobile size and/or design/interact mode. Use inspect_preview to check actual dimensions and readiness after resizing.',
    inputSchema: {
      type: 'object',
      properties: {
        viewport: { type: 'string', enum: ['desktop', 'tablet', 'mobile'] },
        mode: { type: 'string', enum: ['design', 'interact'] },
      },
      anyOf: [{ required: ['viewport'] }, { required: ['mode'] }],
    },
    run: input => {
      const viewport = optStr(input.viewport, 'viewport')
      const mode = optStr(input.mode, 'mode')

      if (
        viewport !== undefined &&
        viewport !== 'desktop' &&
        viewport !== 'tablet' &&
        viewport !== 'mobile'
      ) {
        fail('viewport must be "desktop", "tablet" or "mobile"')
      }

      if (mode !== undefined && mode !== 'design' && mode !== 'interact') {
        fail('mode must be "design" or "interact"')
      }

      if (viewport === undefined && mode === undefined) {
        fail('Provide viewport and/or mode')
      }

      if (viewport) {
        setViewport(viewport)
      }

      if (mode) {
        setMode(mode)
      }

      return { viewport: editor.state.viewport, mode: editor.state.mode }
    },
  },
  {
    name: 'inspect_preview',
    title: 'Inspect preview',
    description:
      'Reports the open preview’s load state, readiness, actual viewport/content dimensions, horizontal overflow and pending/failed images. Does not change the preview.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    run: () => inspectPreview(),
  },
  {
    name: 'screenshot_preview',
    title: 'Screenshot preview',
    description:
      'Returns a PNG of the open preview’s visible viewport, or the rendered bounds of nodeId, plus page/dimension metadata. Waits for readiness. Excludes editor controls without changing selection, mode or scroll. Image content must be forwarded as an image or saved as a PNG by the agent integration to display it to the user. Check metadata warnings for capture fallbacks.',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: {
          type: 'string',
          description:
            'Optional component id from get_page or find_nodes to crop.',
        },
      },
    },
    annotations: { readOnlyHint: true },
    run: async input => {
      const nodeId = optStr(input.nodeId, 'nodeId')

      if (nodeId) {
        const node = locate(currentPage().nodes, nodeId)?.node

        if (!node || isText(node)) {
          fail(`No component with id “${nodeId}” on the open page`)
        }
      }

      const { data, ...metadata } = await screenshotPreview(nodeId)

      return {
        content: [
          { type: 'text', text: JSON.stringify(metadata) },
          { type: 'image', data, mimeType: 'image/png' },
        ],
      } satisfies ToolResult
    },
  },
  ...(['undo', 'redo'] as const).map(name => ({
    name,
    title: name === 'undo' ? 'Undo' : 'Redo',
    description: `${name === 'undo' ? 'Undoes' : 'Redoes'} one step of this browser's editing history, including user and agent edits. Does not affect saved components or the Polaris version. Returns whether anything changed and available history.`,
    inputSchema: { type: 'object', properties: {} },
    run: () => {
      const before = editor.state.doc

      if (name === 'undo') {
        undo()
      } else {
        redo()
      }

      return {
        changed: editor.state.doc !== before,
        pageId: currentPage().id,
        canUndo: canUndo(),
        canRedo: canRedo(),
      }
    },
  })),
  {
    name: 'find_nodes',
    title: 'Find components',
    description:
      'Finds components on a page by exact tag, case-insensitive descendant text, and/or attributes (combined with AND). Attribute strings match exactly, true checks presence, false checks absence; names are case-insensitive. Returns compact matches with parent ids. Defaults to 50 results, maximum 200.',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: PAGE_ID,
        tag: { type: 'string' },
        text: { type: 'string' },
        attrs: {
          type: 'object',
          additionalProperties: { type: ['string', 'boolean'] },
        },
        limit: { type: 'integer', minimum: 1, maximum: 200 },
      },
    },
    annotations: { readOnlyHint: true },
    run: input => {
      const tag = optStr(input.tag, 'tag')?.toLowerCase()
      const text = optStr(input.text, 'text')?.toLowerCase()
      const limit = input.limit === undefined ? 50 : input.limit

      if (
        typeof limit !== 'number' ||
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 200
      ) {
        fail('limit must be an integer between 1 and 200')
      }

      if (
        input.attrs !== undefined &&
        (!input.attrs ||
          typeof input.attrs !== 'object' ||
          Array.isArray(input.attrs))
      ) {
        fail('attrs must be an object of string or boolean values')
      }

      const attrs = Object.entries(input.attrs ?? {})

      if (
        attrs.some(
          ([key, value]) =>
            !key || (typeof value !== 'string' && typeof value !== 'boolean')
        )
      ) {
        fail('attrs must be an object of string or boolean values')
      }

      const p = page(input.pageId)
      const matches: Array<{
        id: string
        tag: string
        parentId: string | null
        text: string
        attrs: Record<string, string | true>
      }> = []
      let total = 0

      walk(p.nodes, (node, parent) => {
        if (isText(node) || (tag && node.tag !== tag)) {
          return
        }

        if (text && !textOf(node).toLowerCase().includes(text)) {
          return
        }

        if (
          !attrs.every(([key, value]) => {
            const actual = Object.entries(node.attrs).find(
              ([name]) => name.toLowerCase() === key.toLowerCase()
            )

            return typeof value === 'boolean'
              ? !!actual === value
              : actual?.[1] === value
          })
        ) {
          return
        }

        total++

        if (matches.length < limit) {
          matches.push({
            id: node.id,
            tag: node.tag,
            parentId: parent?.id ?? null,
            text: textOf(node).slice(0, 120),
            attrs: node.attrs,
          })
        }
      })

      return { pageId: p.id, matches, total, truncated: total > matches.length }
    },
  },
  {
    name: 'duplicate_node',
    title: 'Duplicate component',
    description:
      'Duplicates a component and its descendants immediately after the original, with fresh node/HTML ids and remapped internal references. Selects the copy. Returns its id and validation issues.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' }, pageId: PAGE_ID },
      required: ['id'],
    },
    run: input => {
      const p = page(input.pageId)
      const id = str(input.id, 'id')
      const node = locate(p.nodes, id)?.node

      if (!node || isText(node)) {
        fail(`No component with id “${id}” on this page`)
      }

      duplicate(id)

      return {
        id: editor.state.selectedId,
        pageId: p.id,
        issues: validate(catalog(), currentPage().nodes),
      }
    },
  },
  {
    name: 'duplicate_page',
    title: 'Duplicate page',
    description:
      'Duplicates a page with fresh node ids and a unique name, and opens the copy.',
    inputSchema: { type: 'object', properties: { pageId: PAGE_ID } },
    run: input => {
      const p = page(input.pageId)

      duplicatePage(p.id)

      const copy = currentPage()

      return { id: copy.id, name: copy.name, tree: copy.nodes.map(compact) }
    },
  },
  {
    name: 'list_components',
    title: 'List components',
    description:
      'Lists every Polaris web component available in the current version, grouped by category, with a one-line description.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: CATEGORIES.map(c => c.name) },
      },
    },
    annotations: { readOnlyHint: true },
    run: input => {
      const c = catalog()

      return CATEGORIES.filter(
        cat => !input.category || cat.name === input.category
      ).map(cat => ({
        category: cat.name,
        components: cat.items
          .filter(i => c.components[i.tag])
          .map(i => ({ tag: i.tag, description: i.blurb })),
      }))
    },
  },
  {
    name: 'get_component',
    title: 'Get component reference',
    description:
      'Full reference for one component: properties with types, allowed values and defaults; slots and what each accepts; required parent; events; docs link.',
    inputSchema: {
      type: 'object',
      properties: {
        tag: { type: 'string', description: 'Tag name, e.g. "s-button"' },
      },
      required: ['tag'],
    },
    annotations: { readOnlyHint: true },
    run: input => {
      const tag = str(input.tag, 'tag')
      const spec =
        catalog().components[tag] ??
        fail(`Unknown component “${tag}”. Call list_components.`)

      return {
        tag,
        description: entryFor(tag)?.blurb,
        mustBeInside: RULES[tag]?.parents,
        properties: spec.props.map(p => ({
          name: p.name,
          type: p.kind,
          ...(p.options.length
            ? {
                [p.kind === 'enum' ? 'allowed' : 'suggestions']:
                  p.options.slice(0, 80),
              }
            : {}),
          ...(p.default !== undefined ? { default: p.default } : {}),
          description: p.description,
        })),
        slots: spec.slots.map(s => ({
          name: s.name || '(default)',
          accepts: describeSlot(tag, s.name),
          description: s.description,
        })),
        events: spec.events.map(e => e.name),
        docs: docsUrl(tag, editor.state.doc.version),
      }
    },
  },
  {
    name: 'get_page',
    title: 'Get page',
    description:
      'Returns a page as a component tree (with node ids for editing) and as HTML, plus any validation issues.',
    inputSchema: { type: 'object', properties: { pageId: PAGE_ID } },
    annotations: { readOnlyHint: true },
    run: input => {
      const p = page(input.pageId)

      return {
        id: p.id,
        name: p.name,
        tree: p.nodes.map(compact),
        html: exportPage(p, editor.state.doc.version, catalog(), {
          format: 'html',
          document: false,
          appBridge: false,
          typescript: false,
        }),
        issues: validate(catalog(), p.nodes),
      }
    },
  },
  {
    name: 'create_page',
    title: 'Create page',
    description:
      'Adds a page and opens it. Optionally seed it with HTML, or with a template: blank, home, index, details, settings, empty.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        html: {
          type: 'string',
          description: 'Polaris web component markup for the page body',
        },
        template: {
          type: 'string',
          enum: ['blank', 'home', 'index', 'details', 'settings', 'empty'],
        },
      },
      required: ['name'],
    },
    summary: input => String(input.name),
    run: input => {
      const name = uniquePageName(str(input.name, 'name'))
      const html = optStr(input.html, 'html')
      const parsed = html
        ? parse(html)
        : {
            nodes: fromTemplate(String(input.template ?? 'blank'), name),
            skipped: [],
          }
      const p = addPage(name, parsed.nodes)

      return {
        pageId: p.id,
        name,
        skipped: parsed.skipped,
        issues: validate(catalog(), p.nodes),
      }
    },
  },
  {
    name: 'open_page',
    title: 'Open page',
    description: 'Shows a page in the preview.',
    inputSchema: {
      type: 'object',
      properties: { pageId: PAGE_ID },
      required: ['pageId'],
    },
    run: input => ({ opened: page(input.pageId).id }),
  },
  {
    name: 'rename_page',
    title: 'Rename page',
    description: 'Renames a page.',
    inputSchema: {
      type: 'object',
      properties: { pageId: PAGE_ID, name: { type: 'string' } },
      required: ['pageId', 'name'],
    },
    summary: input => String(input.name),
    run: input => {
      const p = page(input.pageId)

      renamePage(p.id, str(input.name, 'name'))

      return { renamed: p.id }
    },
  },
  {
    name: 'delete_page',
    title: 'Delete page',
    description: 'Deletes a page. The user can undo this.',
    inputSchema: {
      type: 'object',
      properties: { pageId: PAGE_ID },
      required: ['pageId'],
    },
    annotations: { consequentialHint: true },
    run: input => {
      const p = page(input.pageId)

      if (editor.state.doc.pages.length < 2) {
        fail("Can't delete the only page")
      }

      deletePage(p.id)

      return { deleted: p.id }
    },
  },
  {
    name: 'insert_html',
    title: 'Insert components',
    description:
      "Parses Polaris web component HTML and inserts it into a page. Without parentId it goes at the end of the page's top level. Returns the new node ids and any validation issues they introduced.",
    inputSchema: {
      type: 'object',
      properties: {
        html: {
          type: 'string',
          description:
            'Markup using s-* tags, e.g. <s-section heading="Hi"><s-paragraph>…</s-paragraph></s-section>',
        },
        parentId: { type: 'string', description: 'Node id to insert into' },
        slot: {
          type: 'string',
          description:
            'Named slot of the parent, e.g. "primary-action". Omit for the default slot.',
        },
        index: {
          type: 'number',
          description:
            "Position among the parent's children. Defaults to the end.",
        },
        pageId: PAGE_ID,
      },
      required: ['html'],
    },
    summary: input => String(input.html).slice(0, 60),
    run: input => {
      const p = page(input.pageId)
      const parentId = optStr(input.parentId, 'parentId') ?? null
      const parent = parentId ? locate(p.nodes, parentId)?.node : null

      if (parentId && (!parent || isText(parent))) {
        fail(`No component with id “${parentId}” on this page`)
      }

      const siblings = parent && !isText(parent) ? parent.children : p.nodes
      const index =
        typeof input.index === 'number'
          ? Math.max(0, Math.min(siblings.length, Math.floor(input.index)))
          : siblings.length
      const slot = optStr(input.slot, 'slot') ?? ''
      const { nodes, skipped } = parse(str(input.html, 'html'))

      if (!nodes.length) {
        fail('The HTML contained no Polaris components')
      }

      const placed = insertAt(nodes, { parentId, index, slot })
      const ids = new Set(placed.map(n => n.id))
      const issues = validate(catalog(), currentPage().nodes).filter(
        i => ids.has(i.id) || isInside(placed, i.id)
      )

      return {
        inserted: placed.map(n => ({ id: n.id, tag: n.tag })),
        skipped,
        issues,
      }
    },
  },
  {
    name: 'set_page_html',
    title: 'Replace page content',
    description:
      'Replaces everything on a page with the given Polaris web component HTML. Use this to build or rewrite a whole screen in one step.',
    inputSchema: {
      type: 'object',
      properties: { html: { type: 'string' }, pageId: PAGE_ID },
      required: ['html'],
    },
    annotations: { consequentialHint: true },
    summary: input => String(input.html).slice(0, 60),
    run: input => {
      const p = page(input.pageId)
      const { nodes, skipped } = parse(str(input.html, 'html'))

      replacePage(nodes, p.id)

      return {
        pageId: p.id,
        tree: nodes.map(compact),
        skipped,
        issues: validate(catalog(), nodes),
      }
    },
  },
  {
    name: 'update_node',
    title: 'Update component',
    description:
      "Changes a component's attributes and/or text. Attribute values: string, true for boolean attributes, null to remove. Text replaces the component's content.",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        attrs: {
          type: 'object',
          additionalProperties: { type: ['string', 'boolean', 'null'] },
        },
        text: { type: 'string' },
        pageId: PAGE_ID,
      },
      required: ['id'],
    },
    summary: input => String(input.id),
    run: input => {
      const p = page(input.pageId)
      const id = str(input.id, 'id')
      const node =
        locate(p.nodes, id)?.node ??
        fail(`No node with id “${id}” on this page`)

      if (input.attrs !== undefined) {
        if (isText(node)) {
          fail('Text nodes have no attributes; pass text instead')
        }

        if (typeof input.attrs !== 'object' || input.attrs === null) {
          fail('attrs must be an object')
        }

        for (const [name, value] of Object.entries(
          input.attrs as Record<string, unknown>
        )) {
          if (/^on/i.test(name)) {
            fail('Event handler attributes are not allowed')
          }

          setAttr(
            id,
            name,
            value === null || value === false
              ? null
              : value === true
                ? true
                : String(value)
          )
        }
      }

      if (typeof input.text === 'string') {
        setText(id, input.text)
      }

      select(id)

      return {
        node: compact(locate(currentPage().nodes, id)!.node),
        issues: validate(catalog(), currentPage().nodes).filter(
          i => i.id === id
        ),
      }
    },
  },
  {
    name: 'move_node',
    title: 'Move component',
    description:
      "Moves a component to another parent (null for the page's top level), position and slot.",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        parentId: { type: ['string', 'null'] },
        index: { type: 'number' },
        slot: { type: 'string' },
        pageId: PAGE_ID,
      },
      required: ['id', 'parentId'],
    },
    summary: input => String(input.id),
    run: input => {
      const p = page(input.pageId)
      const id = str(input.id, 'id')
      const node = locate(p.nodes, id)?.node ?? fail(`No node with id “${id}”`)
      const parentId =
        input.parentId === null ? null : str(input.parentId, 'parentId')
      const parent = parentId ? locate(p.nodes, parentId)?.node : null

      if (parentId && (!parent || isText(parent))) {
        fail(`No component with id “${parentId}”`)
      }

      const slot = optStr(input.slot, 'slot') ?? ''
      const problem = placementError(
        catalog(),
        parent && !isText(parent) ? parent.tag : null,
        slot,
        node.tag
      )
      const siblings = parent && !isText(parent) ? parent.children : p.nodes
      const index =
        typeof input.index === 'number' ? input.index : siblings.length

      move(id, { parentId, index, slot })

      return { moved: id, warning: problem ?? undefined }
    },
  },
  {
    name: 'remove_node',
    title: 'Remove component',
    description:
      'Removes a component and everything inside it. The user can undo this.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' }, pageId: PAGE_ID },
      required: ['id'],
    },
    summary: input => String(input.id),
    run: input => {
      const p = page(input.pageId)
      const id = str(input.id, 'id')
      const node = locate(p.nodes, id)?.node ?? fail(`No node with id “${id}”`)

      remove(id)

      return { removed: id, tag: node.tag }
    },
  },
  {
    name: 'select_node',
    title: 'Select component',
    description:
      'Selects a component so the user sees it highlighted in the preview and inspector.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
    annotations: { readOnlyHint: true },
    run: input => {
      const id = str(input.id, 'id')
      const node =
        locate(currentPage().nodes, id)?.node ??
        fail(`No node with id “${id}” on the open page`)

      select(id)

      return {
        selected: id,
        tag: node.tag,
        text: textOf(node).slice(0, 80),
        slot: slotOf(node) || undefined,
      }
    },
  },
  {
    name: 'list_saved_components',
    title: 'List saved components',
    description:
      'Lists the components the user saved for reuse, with their markup. Insert one with insert_html using its html.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    run: () =>
      editor.state.presets.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || undefined,
        html: toHTML(p.nodes, catalog()),
      })),
  },
  {
    name: 'save_component',
    title: 'Save component',
    description:
      "Saves Polaris markup, or an existing component on the open page (nodeId), to the user's saved components so it can be reused from the palette.",
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        html: { type: 'string', description: 'Polaris web component markup' },
        nodeId: {
          type: 'string',
          description: 'Save this component from the open page instead of html',
        },
      },
      required: ['name'],
    },
    summary: input => String(input.name),
    run: input => {
      const name = str(input.name, 'name')

      if (
        editor.state.presets.some(
          p => p.name.toLowerCase() === name.toLowerCase()
        )
      ) {
        fail(
          `A saved component is already called “${name}”. Pick another name.`
        )
      }

      const nodeId = optStr(input.nodeId, 'nodeId')
      const nodes = nodeId
        ? [
            locate(currentPage().nodes, nodeId)?.node ??
              fail(`No node with id “${nodeId}” on the open page`),
          ]
        : parse(str(input.html, 'html')).nodes

      if (!nodes.some(n => !isText(n))) {
        fail('Nothing to save: no Polaris components found')
      }

      const preset =
        savePreset({
          name,
          description: optStr(input.description, 'description') ?? '',
          nodes,
        }) ?? fail('This tab is view-only')

      return { id: preset.id, name }
    },
  },
  {
    name: 'validate_page',
    title: 'Validate page',
    description:
      'Checks a page for invalid nesting, slot misuse, bad attribute values and accessibility gaps.',
    inputSchema: { type: 'object', properties: { pageId: PAGE_ID } },
    annotations: { readOnlyHint: true },
    run: input => {
      const p = page(input.pageId)
      const issues = validate(catalog(), p.nodes).map(i => ({
        ...i,
        tag: locate(p.nodes, i.id)?.node.tag,
      }))

      return { valid: !issues.some(i => i.level === 'error'), issues }
    },
  },
  {
    name: 'export_code',
    title: 'Export code',
    description:
      'Returns a page as an HTML document/fragment or a React JSX component.',
    inputSchema: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['html', 'jsx'] },
        document: {
          type: 'boolean',
          description: 'HTML only: full document with the Polaris script tag',
        },
        pageId: PAGE_ID,
      },
      required: ['format'],
    },
    annotations: { readOnlyHint: true },
    run: input => {
      const format =
        input.format === 'jsx'
          ? 'jsx'
          : input.format === 'html'
            ? 'html'
            : fail('format must be "html" or "jsx"')

      const p = page(input.pageId)

      return exportPage(p, editor.state.doc.version, catalog(), {
        format,
        document: input.document === true,
        appBridge: false,
        typescript: true,
      })
    },
  },
  {
    name: 'set_polaris_version',
    title: 'Switch Polaris version',
    description:
      'Switches the preview between Polaris web components v1 (stable) and v2 (release candidate, new admin design).',
    inputSchema: {
      type: 'object',
      properties: { version: { type: 'string', enum: ['v1', 'v2'] } },
      required: ['version'],
    },
    summary: input => String(input.version),
    run: input => {
      const v =
        input.version === 'v1' || input.version === 'v2'
          ? input.version
          : fail('version must be "v1" or "v2"')

      setVersion(v)

      return { version: v }
    },
  },
]

function countElements(nodes: Array<TreeNode>): number {
  return nodes.reduce(
    (n, c) => (isText(c) ? n : n + 1 + countElements(c.children)),
    0
  )
}

function isInside(nodes: Array<TreeNode>, id: string): boolean {
  return nodes.some(
    n =>
      !isText(n) &&
      (n.children.some(c => c.id === id) || isInside(n.children, id))
  )
}

export const TOOL_NAMES = TOOLS.map(t => ({
  name: t.name,
  title: t.title ?? t.name,
  readOnly: !!t.annotations?.readOnlyHint,
}))

export const modelContext = () =>
  typeof document === 'undefined'
    ? undefined
    : (document.modelContext ?? navigator.modelContext)

export function registerWebMCP(): (() => void) | null {
  const mc = modelContext()

  if (!mc) {
    return null
  }

  const controller = new AbortController()

  for (const t of TOOLS) {
    const tool: ToolDef = {
      name: t.name,
      title: t.title,
      description: t.description,
      inputSchema: t.inputSchema,
      annotations: t.annotations,
      execute: async input => {
        const args = input ?? {}

        try {
          if (!t.annotations?.readOnlyHint && !canEdit()) {
            fail(
              'This tab is view-only because the workspace is open in another tab. Use that tab, or choose “Edit here instead” in this one.'
            )
          }

          const result = await t.run(args)

          logAgent(t.title ?? t.name, t.summary?.(args) ?? '', true)

          if (result && typeof result === 'object' && 'content' in result) {
            return result as ToolResult
          }

          return {
            content: [
              {
                type: 'text',
                text:
                  typeof result === 'string'
                    ? result
                    : JSON.stringify(result, null, 1),
              },
            ],
          }
        } catch (e) {
          const message =
            e instanceof ToolError
              ? e.message
              : `Unexpected error: ${(e as Error).message}`

          logAgent(t.title ?? t.name, message, false)

          return { content: [{ type: 'text', text: message }], isError: true }
        }
      },
    }

    try {
      Promise.resolve(
        mc.registerTool(tool, { signal: controller.signal })
      ).catch((e: unknown) =>
        console.warn(`WebMCP: couldn't register ${t.name}`, e)
      )
    } catch (e) {
      console.warn(`WebMCP: couldn't register ${t.name}`, e)
    }
  }

  return () => {
    controller.abort()

    for (const t of TOOLS) {
      try {
        mc.unregisterTool?.(t.name)
      } catch {
        // Already gone: the signal removed it.
      }
    }
  }
}
