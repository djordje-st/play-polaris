import { For, Show, createMemo, createSignal } from 'solid-js'
import { createStore } from 'solid-js/store'
import { useSelector } from '@tanstack/solid-store'
import { POLARIS_SCRIPT, TYPES_PACKAGE } from '../polaris/catalog'
import { fileName, generate, tokensToString } from '../editor/codegen'
import { editor, notify } from '../editor/store'
import { Button, Dialog, DialogHeader, Icon, Segmented } from './ui'
import type { ExportOptions, Token, TokenKind } from '../editor/codegen'

const TOKEN_CLASS: Record<TokenKind, string> = {
  tag: 'text-syntax-tag',
  attr: 'text-syntax-attr',
  value: 'text-syntax-value',
  text: 'text-ink',
  punct: 'text-ink-3',
  keyword: 'text-syntax-keyword',
  plain: '',
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// One escaped HTML string avoids creating thousands of preview nodes through Solid.
const highlight = (tokens: Array<Token>) =>
  tokens
    .map(t =>
      TOKEN_CLASS[t.kind]
        ? `<span class="${TOKEN_CLASS[t.kind]}">${escapeHtml(t.text)}</span>`
        : escapeHtml(t.text)
    )
    .join('')

function save(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: name,
  })

  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function ExportDialog(props: {
  open: boolean
  onClose: () => void
  pageId?: string
}) {
  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title="Export code"
      width="960px"
    >
      <ExportForm
        onClose={props.onClose}
        pageId={props.pageId}
      />
    </Dialog>
  )
}

function ExportForm(props: { onClose: () => void; pageId?: string }) {
  const doc = useSelector(editor, s => s.doc)
  const catalog = useSelector(editor, s => s.catalog)
  const pageId = props.pageId ?? editor.state.pageId
  const [active, setActive] = createSignal(0)
  const [options, setOptions] = createStore<
    ExportOptions & { scope: 'page' | 'all' }
  >({
    format: 'html',
    scope: 'page',
    document: true,
    appBridge: false,
    typescript: true,
  })

  const files = createMemo(() => {
    const c = catalog()

    if (!c) {
      return []
    }

    const pages =
      options.scope === 'all'
        ? doc().pages
        : doc().pages.filter(p => p.id === pageId)
    const used = new Map<string, number>()

    return pages.map(p => {
      let name = fileName(p.name, options)
      const n = used.get(name) ?? 0

      used.set(name, n + 1)

      if (n) {
        name = name.replace(/(\.\w+)$/, `-${n + 1}$1`)
      }

      const tokens = generate(p, doc().version, c, options)

      return { name, tokens, code: tokensToString(tokens) }
    })
  })
  const current = () => files()[Math.min(active(), files().length - 1)]
  const version = () => doc().version

  const copy = async () => {
    const f = current()

    if (!f) {
      return
    }

    try {
      await navigator.clipboard.writeText(f.code)
      notify(`Copied ${f.name}`)
    } catch {
      notify('Your browser blocked clipboard access', 'critical')
    }
  }

  const download = async () => {
    const list = files()
    const [first] = list

    if (!first) {
      return
    }

    if (list.length === 1) {
      const type = options.format === 'html' ? 'text/html' : 'text/plain'

      save(first.name, new Blob([first.code], { type }))
      notify(`Downloaded ${first.name}`)

      return
    }

    const { strToU8, zipSync } = await import('fflate')
    const zip = zipSync(
      Object.fromEntries(list.map(f => [f.name, strToU8(f.code)]))
    )

    save(
      'polaris-pages.zip',
      new Blob([zip.slice()], { type: 'application/zip' })
    )
    notify(`Downloaded ${list.length} pages`)
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        void download()
      }}
    >
      <DialogHeader
        title="Export code"
        onClose={props.onClose}
      >
        Production-ready markup for Polaris web components{' '}
        {version() === 'v1' ? 'v1' : 'v2 RC'}.
      </DialogHeader>

      <div class="flex h-[min(560px,70vh)]">
        <div class="w-[248px] shrink-0 space-y-5 overflow-y-auto border-r border-line p-5">
          <div>
            <p class="mb-1.5 text-sm font-medium text-ink-2">Format</p>

            <Segmented
              label="Format"
              class="flex w-full [&>button]:flex-1"
              value={options.format}
              onChange={v => setOptions('format', v)}
              options={[
                { value: 'html', label: 'HTML' },
                { value: 'jsx', label: 'React JSX' },
              ]}
            />
          </div>

          <div>
            <p class="mb-1.5 text-sm font-medium text-ink-2">Pages</p>

            <Segmented
              label="Pages"
              class="flex w-full [&>button]:flex-1"
              value={options.scope}
              onChange={v => {
                setOptions('scope', v)
                setActive(0)
              }}
              options={[
                { value: 'page', label: 'This page' },
                { value: 'all', label: `All (${doc().pages.length})` },
              ]}
            />
          </div>

          <div class="space-y-3">
            <Show when={options.format === 'html'}>
              <Toggle
                label="Full HTML document"
                hint="Adds the Polaris script tag so the file runs on its own."
                checked={options.document}
                onChange={v => setOptions('document', v)}
              />

              <Show when={options.document}>
                <Toggle
                  label="Include App Bridge"
                  hint="Needed when the page is embedded in the Shopify admin."
                  checked={options.appBridge}
                  onChange={v => setOptions('appBridge', v)}
                />
              </Show>
            </Show>

            <Show when={options.format === 'jsx'}>
              <Toggle
                label="TypeScript (.tsx)"
                hint={`References ${TYPES_PACKAGE[version()].replace(/@[^@]+$/, '')} for typed props.`}
                checked={options.typescript}
                onChange={v => setOptions('typescript', v)}
              />
            </Show>
          </div>

          <div class="rounded-lg bg-chrome p-3 text-xs text-ink-2">
            <Show
              when={options.format === 'jsx'}
              fallback={
                <>
                  Loads{' '}
                  <code class="font-mono">
                    {POLARIS_SCRIPT[version()].split('/').pop()}
                  </code>{' '}
                  from Shopify's CDN.
                </>
              }
            >
              Install types with{' '}
              <code class="font-mono break-all">
                npm i -D {TYPES_PACKAGE[version()]}
              </code>
              , and load{' '}
              <code class="font-mono">
                {POLARIS_SCRIPT[version()].split('/').pop()}
              </code>{' '}
              in your app's document.
            </Show>
          </div>
        </div>

        <div class="flex min-w-0 flex-1 flex-col">
          <Show when={files().length > 1}>
            <div
              role="tablist"
              aria-label="Files"
              class="scroll-thin flex shrink-0 gap-1 overflow-x-auto border-b border-line px-3 pt-2"
            >
              <For each={files()}>
                {(f, i) => (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={i() === active()}
                    class={`-mb-px shrink-0 rounded-t-md border px-2.5 py-1 font-mono text-sm ${
                      i() === active()
                        ? 'border-line border-b-panel bg-panel text-ink'
                        : 'border-transparent text-ink-3 hover:text-ink'
                    }`}
                    onClick={() => setActive(i())}
                  >
                    {f.name}
                  </button>
                )}
              </For>
            </div>
          </Show>

          <div class="flex h-9 shrink-0 items-center justify-between px-4 text-sm text-ink-3">
            <span class="font-mono">{current()?.name}</span>

            <span>{current()?.code.split('\n').length} lines</span>
          </div>

          <pre
            class="scroll-thin min-h-0 flex-1 overflow-auto px-4 pb-4 font-mono text-sm leading-5 whitespace-pre"
            tabindex="0"
            aria-label="Code preview"
            innerHTML={highlight(current()?.tokens ?? [])}
          />
        </div>
      </div>

      <footer class="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
        <Button onClick={copy}>
          <Icon
            name="copy"
            size={14}
          />{' '}
          Copy {files().length > 1 ? 'this file' : ''}
        </Button>

        <Button
          type="submit"
          variant="primary"
        >
          <Icon
            name="download"
            size={14}
          />{' '}
          {files().length > 1 ? 'Download .zip' : 'Download'}
        </Button>
      </footer>
    </form>
  )
}

function Toggle(props: {
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label class="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        class="mt-0.5 size-4 shrink-0 accent-accent"
        checked={props.checked}
        onChange={e => props.onChange(e.currentTarget.checked)}
      />

      <span>
        <span class="block font-medium">{props.label}</span>

        <span class="block text-xs text-ink-3">{props.hint}</span>
      </span>
    </label>
  )
}
