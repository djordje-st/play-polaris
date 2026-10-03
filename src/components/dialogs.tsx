import { For, Show, createMemo, createSignal } from 'solid-js'
import { displayName } from '../polaris/catalog'
import { TEMPLATES } from '../polaris/library'
import { countNodes, isText } from '../editor/model'
import {
  addPage,
  editor,
  fromTemplate,
  insertAt,
  insertionPoint,
  notify,
  parse,
  replacePage,
  savePreset,
  uniquePageName,
  uniquePresetName,
  updatePreset,
} from '../editor/store'
import { Button, Dialog, DialogHeader } from './ui'
import type { JSX } from 'solid-js'
import type { TreeNode } from '../editor/model'
import type { Preset } from '../editor/store'

export function Field(props: {
  label: string
  error?: string
  hint?: string
  children: JSX.Element
}) {
  return (
    <div>
      <label class="block">
        <span class="mb-1 block text-sm font-medium text-ink-2">
          {props.label}
        </span>

        {props.children}
      </label>

      {/* Outside the label so messages don't become part of the field's name. */}
      <Show
        when={props.error}
        fallback={
          <Show when={props.hint}>
            <p class="mt-1 text-xs text-ink-3">{props.hint}</p>
          </Show>
        }
      >
        <p
          role="alert"
          class="mt-1 text-xs text-danger"
        >
          {props.error}
        </p>
      </Show>
    </div>
  )
}

export const inputClass =
  'h-8 w-full rounded-md border border-line-strong bg-panel px-2.5 outline-none transition-colors placeholder:text-ink-3 focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-soft)] aria-[invalid=true]:border-danger'

const submitIfValid =
  (error: () => string | undefined, submit: () => void) => (e: SubmitEvent) => {
    e.preventDefault()

    if (!error()) {
      submit()
    }
  }

const nameTaken = (name: string) =>
  editor.state.doc.pages.some(
    p => p.name.toLowerCase() === name.trim().toLowerCase()
  )

export function NewPageDialog(props: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title="New page"
      width="560px"
    >
      <NewPageForm onClose={props.onClose} />
    </Dialog>
  )
}

function NewPageForm(props: { onClose: () => void }) {
  const [name, setName] = createSignal(uniquePageName('Untitled'))
  const [template, setTemplate] = createSignal('blank')
  const error = () =>
    !name().trim()
      ? 'Give the page a name'
      : nameTaken(name())
        ? 'Another page already uses this name'
        : undefined

  return (
    <form
      onSubmit={submitIfValid(error, () => {
        const trimmed = name().trim()

        addPage(trimmed, fromTemplate(template(), trimmed))
        props.onClose()
      })}
    >
      <DialogHeader
        title="New page"
        onClose={props.onClose}
      >
        Start blank or from a common App Home layout.
      </DialogHeader>

      <div class="space-y-5 px-5 py-4">
        <Field
          label="Name"
          error={error()}
        >
          <input
            class={inputClass}
            autofocus
            value={name()}
            aria-invalid={!!error()}
            onInput={e => setName(e.currentTarget.value)}
          />
        </Field>

        <fieldset>
          <legend class="mb-1 text-sm font-medium text-ink-2">
            Start from
          </legend>

          <div class="grid grid-cols-3 gap-2">
            <For each={TEMPLATES}>
              {t => (
                <label
                  class={`cursor-pointer rounded-lg border px-3 py-2.5 transition-colors ${
                    template() === t.id
                      ? 'border-accent bg-accent-soft shadow-[0_0_0_1px_var(--color-accent)]'
                      : 'border-line hover:border-line-strong'
                  }`}
                >
                  <input
                    type="radio"
                    name="template"
                    class="sr-only"
                    value={t.id}
                    checked={template() === t.id}
                    onChange={() => setTemplate(t.id)}
                  />

                  <span class="block font-medium">{t.name}</span>

                  <span class="block text-xs text-ink-3">{t.blurb}</span>
                </label>
              )}
            </For>
          </div>
        </fieldset>
      </div>

      <footer class="flex justify-end gap-2 border-t border-line px-5 py-3">
        <Button onClick={props.onClose}>Cancel</Button>

        <Button
          type="submit"
          variant="primary"
          disabled={!!error()}
        >
          Create page
        </Button>
      </footer>
    </form>
  )
}

export function ImportDialog(props: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title="Import markup"
      width="640px"
    >
      <ImportForm onClose={props.onClose} />
    </Dialog>
  )
}

type ImportMode = 'insert' | 'replace' | 'page'

const IMPORT_MODES: Array<{ value: ImportMode; label: string }> = [
  { value: 'insert', label: 'Insert at selection' },
  { value: 'replace', label: 'Replace this page' },
  { value: 'page', label: 'Create a new page' },
]

function ImportForm(props: { onClose: () => void }) {
  const [markup, setMarkup] = createSignal('')
  const [touched, setTouched] = createSignal(false)
  const [mode, setMode] = createSignal<ImportMode>('insert')
  const parsed = createMemo(() => (markup().trim() ? parse(markup()) : null))
  const error = () => {
    const result = parsed()

    if (!result) {
      return 'Paste some markup'
    }

    if (!result.nodes.some(n => !isText(n))) {
      return 'No Polaris components (s-* tags) found'
    }

    return undefined
  }
  const hint = () => {
    const result = parsed()

    if (!result) {
      return 'Event handlers, scripts and non-Polaris tags are left out.'
    }

    const skipped = result.skipped.length
      ? `. Skipping ${result.skipped.join(', ')}`
      : ''

    return `Found ${countNodes(result.nodes)} components${skipped}`
  }

  const importNodes = (nodes: Array<TreeNode>) => {
    if (mode() === 'replace') {
      replacePage(nodes)
    } else if (mode() === 'page') {
      addPage(uniquePageName('Imported'), nodes)
    } else {
      const first = nodes.find(n => !isText(n))!
      const at = insertionPoint(first.tag)

      if (at.error !== null) {
        return notify(at.error, 'critical')
      }

      insertAt(nodes, at)
    }

    notify(`Imported ${countNodes(nodes)} components`)
    props.onClose()
  }

  return (
    <form onSubmit={submitIfValid(error, () => importNodes(parsed()!.nodes))}>
      <DialogHeader
        title="Import markup"
        onClose={props.onClose}
      >
        Paste Polaris web component HTML, or JSX copied from Shopify's docs.
      </DialogHeader>

      <div class="space-y-4 px-5 py-4">
        <Field
          label="Markup"
          error={touched() ? error() : undefined}
          hint={hint()}
        >
          <textarea
            class={`${inputClass} h-56 resize-y py-2 font-mono text-sm leading-5`}
            spellcheck={false}
            autofocus
            placeholder={
              '<s-section heading="Shipping">\n  <s-paragraph>Orders ship in 2 days.</s-paragraph>\n</s-section>'
            }
            value={markup()}
            onInput={e => {
              setMarkup(e.currentTarget.value)
              setTouched(true)
            }}
            onBlur={() => setTouched(true)}
          />
        </Field>

        <fieldset class="flex flex-wrap gap-x-5 gap-y-2">
          <legend class="sr-only">Where to put it</legend>

          <For each={IMPORT_MODES}>
            {o => (
              <label class="flex items-center gap-2">
                <input
                  type="radio"
                  name="import-mode"
                  class="accent-accent"
                  checked={mode() === o.value}
                  onChange={() => setMode(o.value)}
                />

                {o.label}
              </label>
            )}
          </For>
        </fieldset>
      </div>

      <footer class="flex justify-end gap-2 border-t border-line px-5 py-3">
        <Button onClick={props.onClose}>Cancel</Button>

        <Button
          type="submit"
          variant="primary"
          disabled={!!error()}
        >
          Import
        </Button>
      </footer>
    </form>
  )
}

// Prefer visible text over a tag name when suggesting a saved component name.
function suggestedName(root: TreeNode | undefined) {
  if (!root || isText(root)) {
    return 'Component'
  }

  const named =
    root.attrs.heading ?? root.attrs.label ?? root.attrs.accessibilityLabel

  return typeof named === 'string' && named.trim()
    ? named.trim()
    : displayName(root.tag)
}

type SaveTarget =
  { kind: 'new'; nodes: Array<TreeNode> } | { kind: 'edit'; preset: Preset }

export function SavePresetDialog(props: {
  target: SaveTarget | null
  onClose: () => void
}) {
  return (
    <Dialog
      open={!!props.target}
      onClose={props.onClose}
      title={
        props.target?.kind === 'edit' ? 'Edit component' : 'Save as component'
      }
      width="460px"
    >
      <Show
        when={props.target}
        keyed
      >
        {target => (
          <SavePresetForm
            target={target}
            onClose={props.onClose}
          />
        )}
      </Show>
    </Dialog>
  )
}

function SavePresetForm(props: { target: SaveTarget; onClose: () => void }) {
  const editing = props.target.kind === 'edit' ? props.target.preset : null
  const nodes =
    props.target.kind === 'new' ? props.target.nodes : editing!.nodes
  const root = nodes.find(n => !isText(n))
  const count = countNodes(nodes)
  const summary = root
    ? `${displayName(root.tag)}${count > 1 ? ` and ${count - 1} more inside` : ''}`
    : 'Text'
  const taken = (name: string) =>
    editor.state.presets.some(
      p =>
        p.id !== editing?.id &&
        p.name.toLowerCase() === name.trim().toLowerCase()
    )

  const [name, setName] = createSignal(
    editing?.name ?? uniquePresetName(suggestedName(root))
  )
  const [description, setDescription] = createSignal(editing?.description ?? '')
  const error = () =>
    !name().trim()
      ? 'Give the component a name'
      : taken(name())
        ? 'You already have a component with this name'
        : undefined

  const save = () => {
    const values = { name: name().trim(), description: description().trim() }

    if (editing) {
      updatePreset(editing.id, values)
      notify(`Updated “${values.name}”`)
    } else {
      savePreset({ ...values, nodes })
      notify(`Saved “${values.name}” to your components`)
    }

    props.onClose()
  }

  return (
    <form onSubmit={submitIfValid(error, save)}>
      <DialogHeader
        title={editing ? 'Edit component' : 'Save as component'}
        onClose={props.onClose}
      >
        {editing
          ? 'Changes apply to future inserts. Copies already on pages stay as they are.'
          : 'Reuse it from the Components panel, the add-here picker, or drag it into place.'}
      </DialogHeader>

      <div class="space-y-4 px-5 py-4">
        <div class="flex items-center gap-2 rounded-md bg-chrome px-3 py-2 text-sm text-ink-2">
          <span class="font-mono text-xs text-ink">
            {root ? `<${root.tag}>` : 'text'}
          </span>

          <span class="truncate">{summary}</span>
        </div>

        <Field
          label="Name"
          error={error()}
        >
          <input
            class={inputClass}
            autofocus
            value={name()}
            aria-invalid={!!error()}
            onInput={e => setName(e.currentTarget.value)}
          />
        </Field>

        <Field
          label="Description"
          hint="Optional. Shown when you hover it in the palette."
        >
          <input
            class={inputClass}
            placeholder="e.g. Metric with trend badge"
            value={description()}
            onInput={e => setDescription(e.currentTarget.value)}
          />
        </Field>
      </div>

      <footer class="flex justify-end gap-2 border-t border-line px-5 py-3">
        <Button onClick={props.onClose}>Cancel</Button>

        <Button
          type="submit"
          variant="primary"
          disabled={!!error()}
        >
          {editing ? 'Save changes' : 'Save component'}
        </Button>
      </footer>
    </form>
  )
}
