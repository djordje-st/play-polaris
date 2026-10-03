import manifestV1 from 'polaris-types-v1/custom-elements?raw'
import manifestV2 from 'polaris-types-v2/custom-elements?raw'
import { buildCatalog } from '../polaris/catalog'
import { isText, locate, parseHTML } from '../editor/model'
import { currentPage, editor, initWorkspace, setCatalog } from '../editor/store'
import type { Catalog, Manifest } from '../polaris/catalog'
import type { Version } from '../editor/model'

export const catalogs: Record<Version, Catalog> = {
  v1: buildCatalog('v1', JSON.parse(manifestV1) as Manifest),
  v2: buildCatalog('v2', JSON.parse(manifestV2) as Manifest),
}

const initialState = editor.state

export function resetEditor(html = '', version: Version = 'v1') {
  const catalog = catalogs[version]

  editor.setState(() => initialState)
  setCatalog(catalog)
  initWorkspace(
    {
      version,
      pages: [
        {
          id: 'page',
          name: 'Test page',
          nodes: parseHTML(html, catalog).nodes,
        },
      ],
      pageId: 'page',
      viewport: 'desktop',
      presets: [],
    },
    catalog
  )
}

export function selectedNode(id = editor.state.selectedId) {
  const node = locate(currentPage().nodes, id ?? '')?.node

  if (!node || isText(node)) {
    throw new Error(`Expected an element with id ${id}`)
  }

  return node
}
