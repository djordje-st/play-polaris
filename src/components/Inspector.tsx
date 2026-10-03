import { For, Show, createMemo, createSignal } from 'solid-js'
import { useSelector } from '@tanstack/solid-store'
import {
  POLARIS_SCRIPT,
  TYPES_PACKAGE,
  VERSION_LABEL,
  displayName,
} from '../polaris/catalog'
import { docsUrl, entryFor } from '../polaris/library'
import {
  RULES,
  attrError,
  describeSlot,
  placementError,
  slotRule,
  validate,
} from '../polaris/rules'
import { countNodes, isText, locate, slotOf, textOf } from '../editor/model'
import {
  currentPage,
  duplicate,
  editor,
  move,
  remove,
  renamePage,
  select,
  setAttr,
  setText,
} from '../editor/store'
import { modKey } from '../editor/shortcuts'
import { iconFor } from './Tree'
import { SavePresetDialog, inputClass } from './dialogs'
import { Icon, IconButton, Popover } from './ui'
import type { JSX } from 'solid-js'
import type { PropSpec } from '../polaris/catalog'
import type { Issue } from '../polaris/rules'
import type { ElementNode } from '../editor/model'

export function Inspector() {
  const nodes = useSelector(editor, s => currentPage(s).nodes)
  const selection = useSelector(editor, s => s.selectedId)
  // A memo avoids walking the tree on unrelated store updates such as hover.

  const selectedId = createMemo(() => {
    const id = selection()

    return id && locate(nodes(), id) ? id : null
  })

  return (
    <aside
      aria-label="Inspector"
      data-tour="inspector"
      class="flex h-full w-[312px] shrink-0 flex-col border-l border-line bg-panel"
    >
      <Show
        when={selectedId()}
        keyed
        fallback={<PagePanel />}
      >
        {id => <NodePanel id={id} />}
      </Show>
    </aside>
  )
}

function Section(props: {
  title: string
  aside?: JSX.Element
  children: JSX.Element
}) {
  return (
    <section class="border-b border-line px-4 py-3">
      <header class="mb-2 flex min-h-6 items-center justify-between gap-2">
        <h3 class="text-sm font-semibold text-ink-2">{props.title}</h3>

        {props.aside}
      </header>

      {props.children}
    </section>
  )
}

function IssueList(props: {
  issues: Array<Issue>
  onPick?: (id: string) => void
}) {
  return (
    <ul class="space-y-1.5">
      <For each={props.issues}>
        {i => (
          <li>
            <button
              type="button"
              disabled={!props.onPick}
              onClick={() => props.onPick?.(i.id)}
              class={`flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                i.level === 'error'
                  ? 'bg-danger-soft text-danger'
                  : 'bg-warn-soft text-warn'
              } ${props.onPick ? 'hover:brightness-[0.97]' : ''}`}
            >
              <Icon
                name={i.level === 'error' ? 'error' : 'warning'}
                size={14}
                class="mt-0.5"
              />

              <span>
                <Show when={props.onPick}>
                  <span class="font-medium">
                    {displayName(
                      locate(currentPage().nodes, i.id)?.node.tag ?? ''
                    )}
                    :{' '}
                  </span>
                </Show>

                {i.message}
              </span>
            </button>
          </li>
        )}
      </For>
    </ul>
  )
}

function NodePanel(props: { id: string }) {
  const nodes = useSelector(editor, s => currentPage(s).nodes)
  const loc = createMemo(() => locate(nodes(), props.id), undefined, {
    equals: (a, b) => a?.node === b?.node && a?.parent === b?.parent,
  })
  const catalog = useSelector(editor, s => s.catalog!)
  const version = useSelector(editor, s => s.doc.version)
  const node = () => loc()!.node
  const issues = createMemo(() =>
    validate(catalog(), nodes()).filter(i => i.id === props.id)
  )

  const [saving, setSaving] = createSignal(false)

  return (
    <div class="scroll-thin min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
      <header class="border-b border-line px-4 pt-3.5 pb-3">
        <div class="flex items-center gap-2">
          <Icon
            name={iconFor(node().tag)}
            class="text-accent"
          />

          <h2 class="min-w-0 flex-1 truncate text-[15px] leading-6 font-semibold">
            {displayName(node().tag)}
          </h2>

          <Show when={!isText(node())}>
            <IconButton
              icon="component"
              label="Save as component"
              size="sm"
              onClick={() => setSaving(true)}
            />
          </Show>

          <IconButton
            icon="copy"
            label={`Duplicate (${modKey()} D)`}
            size="sm"
            onClick={() => duplicate(props.id)}
          />

          <IconButton
            icon="trash"
            label="Delete (⌫)"
            size="sm"
            tone="danger"
            onClick={() => remove(props.id)}
          />
        </div>

        <Show when={!isText(node())}>
          <div class="mt-1.5 flex items-center gap-2 text-sm">
            <code class="rounded bg-hover px-1.5 font-mono text-xs leading-5 text-ink-2">
              &lt;{node().tag}&gt;
            </code>

            <Show when={docsUrl(node().tag, version())}>
              {url => (
                <a
                  href={url()}
                  target="_blank"
                  rel="noreferrer"
                  class="inline-flex items-center gap-1 text-accent hover:underline"
                >
                  Docs{' '}
                  <Icon
                    name="external"
                    size={12}
                  />
                </a>
              )}
            </Show>
          </div>

          <Show when={entryFor(node().tag)?.blurb}>
            <p class="mt-1.5 text-sm text-ink-2">
              {entryFor(node().tag)!.blurb}.
            </p>
          </Show>
        </Show>
      </header>

      <Show
        when={isText(node())}
        fallback={
          <ElementSections
            node={node() as ElementNode}
            parent={loc()!.parent}
          />
        }
      >
        <Section title="Text">
          <textarea
            aria-label="Text"
            class={`${inputClass} h-auto min-h-16 resize-y py-1.5`}
            value={textOf(node())}
            onInput={e => setText(props.id, e.currentTarget.value)}
          />
        </Section>
      </Show>

      <Show when={issues().length}>
        <Section title="Problems">
          <IssueList issues={issues()} />
        </Section>
      </Show>

      <SavePresetDialog
        target={saving() ? { kind: 'new', nodes: [node()] } : null}
        onClose={() => setSaving(false)}
      />
    </div>
  )
}

function ElementSections(props: {
  node: ElementNode
  parent: ElementNode | null
}) {
  const catalog = useSelector(editor, s => s.catalog!)
  const spec = () => catalog().components[props.node.tag]
  const [filter, setFilter] = createSignal('')

  const takesText = () =>
    !!spec() &&
    !placementError(catalog(), props.node.tag, '', '#text') &&
    (!!slotRule(props.node.tag, '')?.text || props.node.children.some(isText))
  const textual = () => props.node.children.every(isText)

  const props_ = createMemo(() =>
    (spec()?.props ?? []).filter(
      p => !filter() || p.name.toLowerCase().includes(filter().toLowerCase())
    )
  )
  const unknown = () =>
    Object.keys(props.node.attrs).filter(
      k => k !== 'slot' && !spec()?.props.some(p => p.name === k)
    )
  const parentSlots = () =>
    props.parent ? (catalog().components[props.parent.tag]?.slots ?? []) : []

  return (
    <>
      <Show when={takesText()}>
        <Section title="Content">
          <Show
            when={textual()}
            fallback={
              <p class="text-sm text-ink-3">
                Mixed text and components. Edit each part in Layers.
              </p>
            }
          >
            <textarea
              aria-label="Content"
              rows={2}
              class={`${inputClass} h-auto min-h-14 resize-y py-1.5`}
              value={textOf(props.node)}
              onInput={e => setText(props.node.id, e.currentTarget.value)}
            />
          </Show>
        </Section>
      </Show>

      <Show when={parentSlots().some(s => s.name)}>
        <Section title="Slot">
          <select
            aria-label="Slot"
            class={inputClass}
            value={slotOf(props.node)}
            onChange={e => {
              const loc = locate(currentPage().nodes, props.node.id)!

              move(props.node.id, {
                parentId: loc.parent?.id ?? null,
                index: loc.index,
                slot: e.currentTarget.value,
              })
            }}
          >
            <For each={parentSlots()}>
              {s => {
                const problem = placementError(
                  catalog(),
                  props.parent!.tag,
                  s.name,
                  props.node.tag
                )

                return (
                  <option
                    value={s.name}
                    disabled={!!problem && s.name !== slotOf(props.node)}
                  >
                    {s.name || 'Default'}

                    {problem ? ' (not allowed)' : ''}
                  </option>
                )
              }}
            </For>
          </select>

          <p class="mt-1.5 text-xs text-ink-3">
            {parentSlots().find(s => s.name === slotOf(props.node))
              ?.description ??
              `Where this goes inside ${displayName(props.parent!.tag)}.`}
          </p>
        </Section>
      </Show>

      <Section
        title="Properties"
        aside={
          <Show when={(spec()?.props.length ?? 0) > 8}>
            <input
              type="search"
              aria-label="Filter properties"
              placeholder="Filter"
              class="h-6 w-28 rounded border border-line bg-chrome px-1.5 text-sm outline-none focus:border-accent focus:bg-panel"
              value={filter()}
              onInput={e => setFilter(e.currentTarget.value)}
            />
          </Show>
        }
      >
        <div class="space-y-3">
          <For each={props_()}>
            {p => (
              <PropField
                id={props.node.id}
                prop={p}
                value={props.node.attrs[p.name]}
              />
            )}
          </For>

          <For each={unknown()}>
            {name => (
              <div class="flex items-center justify-between gap-2 text-sm">
                <span class="font-mono text-warn">{name}</span>

                <button
                  type="button"
                  class="text-accent hover:underline"
                  onClick={() => setAttr(props.node.id, name, null)}
                >
                  Remove
                </button>
              </div>
            )}
          </For>

          <Show when={!props_().length && filter()}>
            <p class="text-sm text-ink-3">No property matches “{filter()}”.</p>
          </Show>
        </div>
      </Section>

      <Show when={spec()?.slots.length}>
        <details class="group border-b border-line px-4 py-3">
          <summary class="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-ink-2">
            Slots
            <Icon
              name="chevronRight"
              size={14}
              class="text-ink-3 transition-transform group-open:rotate-90"
            />
          </summary>

          <ul class="mt-2 space-y-2.5">
            <For each={spec()!.slots}>
              {s => (
                <li class="text-sm">
                  <div class="flex items-baseline justify-between gap-2">
                    <span class="font-mono text-xs text-ink">
                      {s.name || 'default'}
                    </span>

                    <span class="truncate text-xs text-ink-3">
                      {describeSlot(props.node.tag, s.name)}
                    </span>
                  </div>

                  <p class="mt-0.5 text-ink-2">{s.description}</p>
                </li>
              )}
            </For>
          </ul>

          <Show when={RULES[props.node.tag]?.parents}>
            {parents => (
              <p class="mt-2.5 text-sm text-ink-2">
                Must be placed directly inside{' '}
                {parents()
                  .map(t => `<${t}>`)
                  .join(' or ')}
                .
              </p>
            )}
          </Show>
        </details>
      </Show>

      <Show when={spec()?.events.length}>
        <details class="group border-b border-line px-4 py-3">
          <summary class="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-ink-2">
            Events
            <Icon
              name="chevronRight"
              size={14}
              class="text-ink-3 transition-transform group-open:rotate-90"
            />
          </summary>

          <ul class="mt-2 space-y-2">
            <For each={spec()!.events}>
              {e => (
                <li class="text-sm">
                  <span class="font-mono text-xs">{e.name}</span>

                  <p class="text-ink-2">{e.description}</p>
                </li>
              )}
            </For>
          </ul>
        </details>
      </Show>
    </>
  )
}

function PropField(props: {
  id: string
  prop: PropSpec
  value: string | true | undefined
}) {
  const p = props.prop
  const listId = `opts-${props.id}-${p.name}`
  const helpId = `${listId}-help`
  const errorId = `${listId}-error`
  const isSet = () => props.value !== undefined
  const error = () =>
    props.value === undefined ? null : attrError(p, props.value)
  const str = () => (typeof props.value === 'string' ? props.value : '')
  const optionDoc = () => p.optionDocs[str() || p.default || '']
  // Empty alt is meaningful (decorative image); elsewhere empty means unset.
  const setString = (v: string) =>
    setAttr(props.id, p.name, v === '' && p.name !== 'alt' ? null : v)

  const control = () => {
    if (p.kind === 'boolean') {
      return (
        <button
          type="button"
          role="switch"
          aria-checked={props.value === true}
          aria-label={p.name}
          aria-describedby={p.description ? helpId : undefined}
          onClick={() =>
            setAttr(props.id, p.name, props.value === true ? null : true)
          }
          class={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${props.value === true ? 'bg-accent' : 'bg-line-strong'}`}
        >
          <span
            class={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform ${props.value === true ? 'translate-x-4' : ''}`}
          />
        </button>
      )
    }

    if (p.kind === 'enum') {
      return (
        <select
          aria-label={p.name}
          aria-invalid={!!error()}
          aria-describedby={
            error() ? errorId : p.description ? helpId : undefined
          }
          class={inputClass}
          value={str()}
          onChange={e => setString(e.currentTarget.value)}
        >
          <option value="">
            {p.default ? `Default (${p.default})` : 'Not set'}
          </option>

          <Show when={str() && !p.options.includes(str())}>
            <option
              value={str()}
              disabled
            >
              {str()} (invalid)
            </option>
          </Show>

          <For each={p.options}>{o => <option value={o}>{o}</option>}</For>
        </select>
      )
    }

    return (
      <>
        <input
          aria-label={p.name}
          aria-invalid={!!error()}
          aria-describedby={
            error() ? errorId : p.description ? helpId : undefined
          }
          class={`${inputClass} ${p.kind === 'number' ? 'tabular-nums' : ''}`}
          inputmode={p.kind === 'number' ? 'decimal' : undefined}
          list={p.options.length ? listId : undefined}
          placeholder={p.default && p.default !== "''" ? p.default : ''}
          value={str()}
          onInput={e => setString(e.currentTarget.value)}
        />

        <Show when={p.options.length}>
          <datalist id={listId}>
            <For each={p.options}>{o => <option value={o} />}</For>
          </datalist>
        </Show>
      </>
    )
  }

  return (
    <div>
      <div
        class={`flex min-h-5 items-center gap-1.5 ${p.kind === 'boolean' ? '' : 'mb-1'}`}
      >
        <span
          class={`font-mono text-xs font-medium ${isSet() ? 'text-ink' : 'text-ink-2'}`}
        >
          {p.name}
        </span>

        <Show when={p.description}>
          <Popover
            label={`Help for ${p.name}`}
            class="max-h-64 w-64 overflow-y-auto"
            trigger={attrs => (
              <button
                {...attrs}
                type="button"
                aria-label={`Help for ${p.name}`}
                class="grid size-5 shrink-0 place-items-center rounded text-ink-3 hover:bg-hover hover:text-ink"
              >
                <Icon
                  name="info"
                  size={12}
                />
              </button>
            )}
          >
            {() => (
              <div
                id={helpId}
                class="space-y-2 p-2 text-sm text-ink-2"
              >
                <p>{p.description}</p>
                <Show when={optionDoc()}>
                  <p>{optionDoc()}</p>
                </Show>
              </div>
            )}
          </Popover>
        </Show>

        <span class="flex-1" />

        <button
          type="button"
          aria-label={`Reset ${p.name}`}
          disabled={!isSet()}
          class="text-xs text-ink-3 enabled:hover:text-ink disabled:opacity-30"
          onClick={() => setAttr(props.id, p.name, null)}
        >
          Reset
        </button>

        <Show when={p.kind === 'boolean'}>{control()}</Show>
      </div>

      <Show when={p.kind !== 'boolean'}>{control()}</Show>

      <Show when={error()}>
        <p
          id={errorId}
          role="alert"
          class="mt-1 text-xs text-danger"
        >
          {error()}
        </p>
      </Show>
    </div>
  )
}

function PagePanel() {
  const page = useSelector(editor, s => currentPage(s))
  const catalog = useSelector(editor, s => s.catalog!)
  const version = useSelector(editor, s => s.doc.version)
  const issues = createMemo(() => validate(catalog(), page().nodes))

  return (
    <div class="scroll-thin min-h-0 flex-1 overflow-y-auto">
      <header class="border-b border-line px-4 pt-3.5 pb-3">
        <div class="flex items-center gap-2">
          <Icon
            name="page"
            class="text-accent"
          />

          <h2 class="text-[15px] leading-6 font-semibold">Page</h2>
        </div>

        <p class="mt-1 text-sm text-ink-2">
          Select a component in the preview or in Layers to edit it.
        </p>
      </header>

      <Section title="Name">
        <input
          aria-label="Page name"
          class={inputClass}
          value={page().name}
          onChange={e =>
            e.currentTarget.value.trim() &&
            renamePage(page().id, e.currentTarget.value.trim())
          }
        />

        <p class="mt-1.5 text-xs text-ink-3">
          {countNodes(page().nodes)} components
        </p>
      </Section>

      <Section title="Problems">
        <Show
          when={issues().length}
          fallback={
            <p class="flex items-center gap-1.5 text-sm text-ok">
              <Icon
                name="check"
                size={14}
              />{' '}
              Valid structure, slots and properties.
            </p>
          }
        >
          <IssueList
            issues={issues()}
            onPick={id => select(id)}
          />
        </Show>
      </Section>

      <Section title="Preview">
        <dl class="space-y-2 text-sm">
          <div>
            <dt class="text-ink-3">Polaris</dt>

            <dd>
              {VERSION_LABEL[version()]} ·{' '}
              <code class="font-mono text-xs">
                {POLARIS_SCRIPT[version()].split('/').pop()}
              </code>
            </dd>
          </div>

          <div>
            <dt class="text-ink-3">Types and rules</dt>

            <dd>
              <code class="font-mono text-xs">{TYPES_PACKAGE[version()]}</code>
            </dd>
          </div>
        </dl>

        <Show when={version() === 'v2'}>
          <p class="mt-2.5 rounded-md bg-warn-soft px-2.5 py-2 text-sm text-warn">
            The 2.0 release candidate shows the new admin design. It can still
            change before it's stable.
          </p>
        </Show>
      </Section>
    </div>
  )
}
