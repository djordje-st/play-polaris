import { For, Show, createMemo, createSignal, onCleanup } from 'solid-js'
import { useSelector } from '@tanstack/solid-store'
import { displayName } from '../polaris/catalog'
import { CATEGORIES } from '../polaris/library'
import { useDraggable } from '@dnd-kit/solid'
import { countNodes, locate } from '../editor/model'
import {
  currentPage,
  deletePage,
  deletePreset,
  duplicatePage,
  editor,
  insertComponent,
  insertPreset,
  notify,
  updatePreset,
  openPage,
  renamePage,
} from '../editor/store'
import { iconFor, Tree } from './Tree'
import { ImportDialog, NewPageDialog, SavePresetDialog } from './dialogs'
import { ExportDialog } from './ExportDialog'
import { Button, Icon, IconButton, Menu, Segmented } from './ui'
import type { DragData } from '../editor/dnd'
import type { Page } from '../editor/model'
import type { Preset } from '../editor/store'

export function Sidebar() {
  const [tab, setTab] = createSignal<'layers' | 'components'>('layers')
  const [importing, setImporting] = createSignal(false)
  let search!: HTMLInputElement

  const find = () => {
    setTab('components')
    queueMicrotask(() => search.focus())
  }

  addEventListener('playground:find-component', find)
  onCleanup(() => removeEventListener('playground:find-component', find))

  return (
    <aside
      aria-label="Pages and layers"
      class="flex h-full w-[272px] shrink-0 flex-col border-r border-line bg-panel select-none"
    >
      <Pages />

      <div
        data-tour="sidebar-tabs"
        class="border-t border-line px-2 pt-2 pb-1.5"
      >
        <Segmented
          label="Sidebar view"
          class="flex w-full [&>button]:flex-1"
          value={tab()}
          onChange={setTab}
          options={[
            {
              value: 'layers',
              label: (
                <>
                  <Icon
                    name="layers"
                    size={14}
                  />{' '}
                  Layers
                </>
              ),
            },
            {
              value: 'components',
              label: (
                <>
                  <Icon
                    name="blocks"
                    size={14}
                  />{' '}
                  Components
                </>
              ),
            },
          ]}
        />
      </div>

      <Show
        when={tab() === 'layers'}
        fallback={<Palette ref={el => (search = el)} />}
      >
        <Tree />

        <div class="border-t border-line p-2">
          <Button
            variant="ghost"
            size="sm"
            class="w-full justify-start"
            onClick={() => setImporting(true)}
          >
            <Icon
              name="upload"
              size={14}
            />{' '}
            Import HTML or JSX
          </Button>
        </div>
      </Show>

      <ImportDialog
        open={importing()}
        onClose={() => setImporting(false)}
      />
    </aside>
  )
}

function Pages() {
  const pages = useSelector(editor, s => s.doc.pages)
  const pageId = useSelector(editor, s => s.pageId)
  const [creating, setCreating] = createSignal(false)
  const [exporting, setExporting] = createSignal<string | null>(null)
  const [editing, setEditing] = createSignal<string | null>(null)

  return (
    <section
      aria-labelledby="pages-heading"
      data-tour="pages"
      class="flex max-h-[38%] min-h-0 flex-col"
    >
      <header class="flex h-10 shrink-0 items-center justify-between pr-2 pl-3">
        <h2
          id="pages-heading"
          class="text-sm font-semibold text-ink-2"
        >
          Pages
        </h2>

        <IconButton
          icon="plus"
          label="New page"
          size="sm"
          onClick={() => setCreating(true)}
        />
      </header>

      <ul class="scroll-thin min-h-0 overflow-y-auto px-1.5 pb-2">
        <For each={pages()}>
          {page => (
            <PageRow
              page={page}
              active={page.id === pageId()}
              editing={editing() === page.id}
              onEdit={on => setEditing(on ? page.id : null)}
              onExport={() => setExporting(page.id)}
              canDelete={pages().length > 1}
            />
          )}
        </For>
      </ul>

      <NewPageDialog
        open={creating()}
        onClose={() => setCreating(false)}
      />

      <ExportDialog
        open={!!exporting()}
        pageId={exporting() ?? undefined}
        onClose={() => setExporting(null)}
      />
    </section>
  )
}

function PageRow(props: {
  page: Page
  active: boolean
  editing: boolean
  canDelete: boolean
  onEdit: (on: boolean) => void
  onExport: () => void
}) {
  const count = createMemo(() => countNodes(props.page.nodes))
  const commitName = (value: string) => {
    const name = value.trim()

    if (name && name !== props.page.name) {
      renamePage(props.page.id, name)
    }

    props.onEdit(false)
  }

  return (
    <li
      class={`group flex h-8 items-center gap-2 rounded-md pr-1 pl-2 ${props.active ? 'bg-accent-soft' : 'hover:bg-hover'}`}
      onDblClick={() => props.onEdit(true)}
    >
      <Icon
        name="page"
        size={14}
        class={props.active ? 'text-accent' : 'text-ink-3'}
      />

      <Show
        when={props.editing}
        fallback={
          <button
            type="button"
            class={`min-w-0 flex-1 truncate text-left ${props.active ? 'font-medium' : ''}`}
            aria-current={props.active ? 'page' : undefined}
            onClick={() => openPage(props.page.id)}
          >
            {props.page.name}
          </button>
        }
      >
        <input
          ref={el => queueMicrotask(() => el.select())}
          aria-label="Page name"
          class="h-6 min-w-0 flex-1 rounded border border-accent bg-panel px-1.5 outline-none"
          value={props.page.name}
          onBlur={e => commitName(e.currentTarget.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              commitName(e.currentTarget.value)
            }

            if (e.key === 'Escape') {
              props.onEdit(false)
            }
          }}
        />
      </Show>

      <span class="text-xs text-ink-3 tabular-nums group-hover:hidden">
        {count()}
      </span>

      <Menu
        align="end"
        trigger={attrs => (
          <button
            type="button"
            {...attrs}
            aria-label={`Actions for ${props.page.name}`}
            class="hidden size-6 place-items-center rounded text-ink-3 group-hover:grid hover:bg-raised hover:text-ink focus-visible:grid"
          >
            <Icon
              name="more"
              size={14}
            />
          </button>
        )}
        items={[
          {
            label: 'Rename',
            icon: 'pencil',
            onSelect: () => props.onEdit(true),
          },
          {
            label: 'Duplicate',
            icon: 'copy',
            onSelect: () => duplicatePage(props.page.id),
          },
          { label: 'Export page…', icon: 'download', onSelect: props.onExport },
          'separator',
          {
            label: 'Delete',
            icon: 'trash',
            danger: true,
            disabled: !props.canDelete,
            onSelect: () => deletePage(props.page.id),
          },
        ]}
      />
    </li>
  )
}

function Palette(props: { ref: (el: HTMLInputElement) => void }) {
  const [query, setQuery] = createSignal('')
  const catalog = useSelector(editor, s => s.catalog)
  const presets = useSelector(editor, s => s.presets)
  const saved = createMemo(() => {
    const q = query().trim().toLowerCase()

    return presets().filter(
      p => !q || `${p.name} ${p.description}`.toLowerCase().includes(q)
    )
  })
  const groups = createMemo(() => {
    const q = query().trim().toLowerCase()

    return CATEGORIES.map(c => ({
      ...c,
      items: c.items.filter(
        i =>
          catalog()?.components[i.tag] &&
          (!q ||
            `${i.tag} ${displayName(i.tag)} ${i.blurb} ${c.name}`
              .toLowerCase()
              .includes(q))
      ),
    })).filter(g => g.items.length)
  })

  const [editing, setEditing] = createSignal<Preset | null>(null)

  return (
    <div class="flex min-h-0 flex-1 flex-col">
      <div class="px-2 pb-2">
        <label class="flex h-8 items-center gap-2 rounded-md border border-line bg-chrome px-2 focus-within:border-accent focus-within:bg-panel">
          <Icon
            name="search"
            size={14}
            class="text-ink-3"
          />

          <input
            ref={props.ref}
            type="search"
            placeholder="Search components"
            aria-label="Search components"
            class="min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-3"
            value={query()}
            onInput={e => setQuery(e.currentTarget.value)}
            onKeyDown={e => {
              if (e.key !== 'Enter') {
                return
              }

              const preset = saved()[0]
              const first = groups()[0]?.items[0]

              if (preset) {
                insertPreset(preset.id)
              } else if (first) {
                insertComponent(first.tag)
              }
            }}
          />
        </label>
      </div>

      <div class="scroll-thin min-h-0 flex-1 overflow-y-auto px-2 pb-6">
        <p class="px-1 pb-1 text-xs text-ink-3">
          Click to insert at the selection, or drag into place.
        </p>

        <Show
          when={saved().length}
          fallback={
            <Show when={!presets().length && !query()}>
              <p class="mx-1 mt-2 flex items-start gap-2 rounded-md border border-dashed border-line-strong px-2.5 py-2 text-xs text-ink-3">
                <Icon
                  name="component"
                  size={14}
                  class="mt-px shrink-0"
                />
                Select something you built and choose Save as component in the
                inspector to reuse it here.
              </p>
            </Show>
          }
        >
          <section class="pt-2">
            <h3 class="px-1 pb-1 text-xs font-medium text-ink-3">Saved</h3>

            <div class="grid gap-0.5">
              <For each={saved()}>
                {preset => (
                  <PresetTile
                    preset={preset}
                    onEdit={() => setEditing(preset)}
                  />
                )}
              </For>
            </div>
          </section>
        </Show>

        <For each={groups()}>
          {g => (
            <section class="pt-2">
              <h3 class="px-1 pb-1 text-xs font-medium text-ink-3">{g.name}</h3>

              <div class="grid grid-cols-2 gap-1">
                <For each={g.items}>
                  {item => (
                    <PaletteTile
                      tag={item.tag}
                      blurb={item.blurb}
                    />
                  )}
                </For>
              </div>
            </section>
          )}
        </For>

        <Show when={!groups().length && !saved().length}>
          <p class="px-2 py-8 text-center text-sm text-ink-3">
            No component matches “{query()}”.
          </p>
        </Show>
      </div>

      <SavePresetDialog
        target={editing() ? { kind: 'edit', preset: editing()! } : null}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}

function PaletteTile(props: { tag: string; blurb: string }) {
  const { ref } = useDraggable({
    id: `palette:${props.tag}`,
    data: { kind: 'new', tag: props.tag } satisfies DragData,
  })

  return (
    <button
      ref={ref}
      type="button"
      title={props.blurb}
      class="flex h-9 min-w-0 cursor-grab items-center gap-2 rounded-md border border-transparent px-2 text-left transition-colors hover:border-line hover:bg-chrome active:cursor-grabbing"
      onClick={() => insertComponent(props.tag)}
    >
      <Icon
        name={iconFor(props.tag)}
        size={14}
        class="text-ink-3"
      />

      <span class="truncate">{displayName(props.tag)}</span>
    </button>
  )
}

function PresetTile(props: { preset: Preset; onEdit: () => void }) {
  const { ref } = useDraggable({
    id: `preset:${props.preset.id}`,
    data: { kind: 'preset', id: props.preset.id } satisfies DragData,
  })
  const selectedId = useSelector(editor, s => s.selectedId)

  return (
    <div class="group relative min-w-0">
      <button
        ref={ref}
        type="button"
        title={props.preset.description || `Insert ${props.preset.name}`}
        class="flex h-9 w-full min-w-0 cursor-grab items-center gap-2 rounded-md border border-transparent pr-6 pl-2 text-left transition-colors hover:border-line hover:bg-chrome active:cursor-grabbing"
        onClick={() => insertPreset(props.preset.id)}
      >
        <Icon
          name="component"
          size={14}
          class="shrink-0 text-accent"
        />

        <span class="max-w-full shrink-0 truncate">{props.preset.name}</span>

        <span class="min-w-0 truncate text-xs text-ink-3">
          {props.preset.description}
        </span>
      </button>

      <div class="absolute inset-y-0 right-1 flex items-center">
        <Menu
          align="end"
          trigger={attrs => (
            <button
              {...attrs}
              type="button"
              aria-label={`Actions for ${props.preset.name}`}
              class="grid size-5 place-items-center rounded text-ink-3 opacity-0 group-hover:opacity-100 hover:bg-raised hover:text-ink focus-visible:opacity-100 aria-expanded:opacity-100"
            >
              <Icon
                name="more"
                size={12}
              />
            </button>
          )}
          items={[
            {
              label: 'Insert',
              icon: 'plus',
              onSelect: () => insertPreset(props.preset.id),
            },
            {
              label: 'Edit name and description…',
              icon: 'pencil',
              onSelect: props.onEdit,
            },
            {
              label: 'Replace with selection',
              icon: 'replace',
              disabled: !selectedId(),
              onSelect: () => {
                const node =
                  selectedId() &&
                  locate(currentPage().nodes, selectedId()!)?.node

                if (!node) {
                  return
                }

                updatePreset(props.preset.id, { nodes: [node] })
                notify(`Updated “${props.preset.name}” from the selection`)
              },
            },
            'separator',
            {
              label: 'Delete',
              icon: 'trash',
              danger: true,
              onSelect: () => deletePreset(props.preset.id),
            },
          ]}
        />
      </div>
    </div>
  )
}
