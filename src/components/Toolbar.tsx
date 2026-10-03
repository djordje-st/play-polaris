import { For, Show, createSignal } from 'solid-js'
import { useSelector } from '@tanstack/solid-store'
import { TOOL_NAMES } from '../editor/webmcp'
import {
  editor,
  notify,
  redo,
  setMode,
  setVersion,
  setViewport,
  undo,
} from '../editor/store'
import { purgeWorkspace } from '../editor/persistence'
import { modKey, shortcutList } from '../editor/shortcuts'
import { ExportDialog } from './ExportDialog'
import { Logo } from './Logo'
import { ThemeMenu } from './ThemeMenu'
import { startTour } from './tour'
import { Button, Icon, IconButton, Kbd, Popover, Segmented } from './ui'

export function Toolbar(props: {
  loadingVersion: boolean
  agentReady: boolean
}) {
  const version = useSelector(editor, s => s.doc.version)
  const mode = useSelector(editor, s => s.mode)
  const viewport = useSelector(editor, s => s.viewport)
  const canUndo = useSelector(editor, s => s.past.length > 0)
  const canRedo = useSelector(editor, s => s.future.length > 0)
  const [exporting, setExporting] = createSignal(false)
  const [purging, setPurging] = createSignal(false)

  const clearData = async () => {
    if (
      !window.confirm(
        'Delete all pages, saved components, and workspace settings from this browser? This cannot be undone. Export any work you want to keep first.'
      )
    ) {
      return
    }

    setPurging(true)

    try {
      await purgeWorkspace()
      notify('Local data cleared')
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Could not clear local data.',
        'critical'
      )
    } finally {
      setPurging(false)
    }
  }

  return (
    <header class="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-panel px-3 select-none">
      <div class="flex items-center gap-2 pr-1">
        <Logo />

        <span class="font-semibold whitespace-nowrap">Polaris Playground</span>
      </div>

      <div data-tour="version">
        <Segmented
          label="Polaris version"
          value={version()}
          onChange={setVersion}
          options={[
            {
              value: 'v1',
              label: 'v1',
              title:
                'Polaris web components 1.x (polaris-1.js), the current admin design',
            },
            {
              value: 'v2',
              label: (
                <>
                  v2{' '}
                  <span class="rounded bg-warn-soft px-1 text-[10px] leading-4 font-semibold text-warn">
                    RC
                  </span>
                </>
              ),
              title:
                'Polaris 2.0 release candidate (polaris-2.0-rc.js), the new admin design',
            },
          ]}
        />
      </div>

      <Show when={props.loadingVersion}>
        <span class="text-sm text-ink-3">Loading…</span>
      </Show>

      <div class="flex flex-1 items-center justify-center gap-2">
        <Segmented
          label="Mode"
          value={mode()}
          onChange={setMode}
          options={[
            {
              value: 'design',
              label: (
                <>
                  <Icon
                    name="cursor"
                    size={14}
                  />{' '}
                  Design
                </>
              ),
              title: 'Select, drag and edit components',
            },
            {
              value: 'interact',
              label: (
                <>
                  <Icon
                    name="play"
                    size={14}
                  />{' '}
                  Interact
                </>
              ),
              title: 'Use the components as a merchant would',
            },
          ]}
        />

        <Segmented
          label="Viewport"
          value={viewport()}
          onChange={setViewport}
          options={[
            {
              value: 'desktop',
              label: (
                <Icon
                  name="desktop"
                  size={15}
                />
              ),
              title: 'Desktop',
            },
            {
              value: 'tablet',
              label: (
                <Icon
                  name="tablet"
                  size={15}
                />
              ),
              title: 'Tablet, 834px',
            },
            {
              value: 'mobile',
              label: (
                <Icon
                  name="mobile"
                  size={15}
                />
              ),
              title: 'Mobile, 390px',
            },
          ]}
        />
      </div>

      <div class="flex items-center gap-1">
        <SaveStatus />

        <IconButton
          icon="undo"
          label={`Undo (${modKey()} Z)`}
          disabled={!canUndo()}
          onClick={undo}
        />

        <IconButton
          icon="redo"
          label={`Redo (⇧ ${modKey()} Z)`}
          disabled={!canRedo()}
          onClick={redo}
        />

        <IconButton
          icon="trash"
          label="Clear local data"
          tone="danger"
          disabled={purging()}
          onClick={() => void clearData()}
        />

        <span class="mx-1 h-5 w-px bg-line" />

        <AgentPanel ready={props.agentReady} />

        <ThemeMenu />

        <Popover
          align="end"
          label="Help"
          class="w-72 p-3"
          trigger={attrs => (
            <button
              {...attrs}
              type="button"
              aria-label="Help"
              title="Help and keyboard shortcuts"
              class="grid size-8 place-items-center rounded-md text-ink-2 hover:bg-hover hover:text-ink"
            >
              <Icon name="help" />
            </button>
          )}
        >
          {close => (
            <>
              <button
                type="button"
                class="-mx-1 mb-3 flex w-[calc(100%+0.5rem)] items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-hover"
                onClick={() => {
                  close()
                  void startTour()
                }}
              >
                <Icon
                  name="play"
                  size={14}
                  class="text-accent"
                />

                <span>
                  <span class="block font-medium">Take the tour</span>

                  <span class="block text-xs text-ink-3">
                    A one-minute look at what's here
                  </span>
                </span>
              </button>

              <p class="mb-2 border-t border-line pt-3 font-semibold">
                Keyboard shortcuts
              </p>

              <dl class="space-y-1.5 text-sm">
                <For each={shortcutList()}>
                  {([keys, action]) => (
                    <div class="flex items-center justify-between gap-3">
                      <dt class="text-ink-2">{action}</dt>

                      <dd>
                        <Kbd>{keys}</Kbd>
                      </dd>
                    </div>
                  )}
                </For>
              </dl>
            </>
          )}
        </Popover>

        <Button
          variant="primary"
          class="ml-1"
          data-tour="export"
          onClick={() => setExporting(true)}
        >
          <Icon
            name="code"
            size={14}
          />{' '}
          Export
        </Button>
      </div>

      <ExportDialog
        open={exporting()}
        onClose={() => setExporting(false)}
      />
    </header>
  )
}

function SaveStatus() {
  const state = useSelector(editor, s => s.saveState)
  const viewing = useSelector(editor, s => s.access === 'viewing')

  return (
    <Show
      when={!viewing()}
      fallback={
        <span class="flex w-28 shrink-0 items-center gap-1 px-1.5 text-sm whitespace-nowrap text-ink-3">
          <Icon
            name="eye"
            size={14}
          />{' '}
          View only
        </span>
      }
    >
      <span
        class={`flex w-28 shrink-0 items-center gap-1 px-1.5 text-sm whitespace-nowrap ${state() === 'error' ? 'text-danger' : 'text-ink-3'}`}
        title={
          state() === 'error'
            ? 'This browser blocked local storage, so changes will be lost when you close the tab. Export your pages to keep them.'
            : 'Saved in this browser. Nothing leaves your device.'
        }
        aria-live="polite"
      >
        <Show
          when={state() !== 'saving'}
          fallback="Saving…"
        >
          <Icon
            name={state() === 'error' ? 'warning' : 'check'}
            size={14}
          />

          {state() === 'error' ? 'Not saved' : 'Saved locally'}
        </Show>
      </span>
    </Show>
  )
}

function AgentPanel(props: { ready: boolean }) {
  const log = useSelector(editor, s => s.agentLog)
  const time = (at: number) =>
    new Date(at).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    })

  return (
    <Popover
      align="end"
      label="AI agents"
      class="w-[340px] p-0"
      trigger={attrs => (
        <button
          {...attrs}
          type="button"
          title="AI agents (WebMCP)"
          class="relative flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-ink-2 hover:bg-hover hover:text-ink"
        >
          <Icon
            name="sparkle"
            size={15}
          />
          AI
          <span
            class={`size-1.5 rounded-full ${props.ready ? 'bg-ok' : 'bg-line-strong'}`}
          />
        </button>
      )}
    >
      {() => (
        <div class="text-sm">
          <div class="border-b border-line p-3">
            <p class="font-semibold">AI agents</p>

            <Show
              when={props.ready}
              fallback={
                <p class="mt-1 text-ink-2">
                  This browser doesn't expose WebMCP. Open the playground in a
                  browser with WebMCP enabled (Edge 147+, or Chrome with the
                  WebMCP origin trial or a WebMCP extension) and agents can
                  build pages here directly.
                </p>
              }
            >
              <p class="mt-1 text-ink-2">
                An agent in this browser can use {TOOL_NAMES.length} tools to
                read the component catalog, build and validate pages, and export
                code. Every change lands in your undo history.
              </p>
            </Show>
          </div>

          <div class="max-h-64 overflow-y-auto p-3">
            <Show
              when={log().length}
              fallback={
                <>
                  <p class="mb-1.5 text-xs font-medium text-ink-3">Tools</p>

                  <ul class="flex flex-wrap gap-1">
                    <For each={TOOL_NAMES}>
                      {t => (
                        <li
                          class="rounded bg-hover px-1.5 font-mono text-xs leading-5 text-ink-2"
                          title={t.title}
                        >
                          {t.name}
                        </li>
                      )}
                    </For>
                  </ul>
                </>
              }
            >
              <p class="mb-1.5 text-xs font-medium text-ink-3">
                Recent activity
              </p>

              <ul class="space-y-1.5">
                <For each={log()}>
                  {e => (
                    <li class="flex items-start gap-2">
                      <Icon
                        name={e.ok ? 'check' : 'error'}
                        size={14}
                        class={`mt-0.5 ${e.ok ? 'text-ok' : 'text-danger'}`}
                      />

                      <span class="min-w-0 flex-1">
                        <span class="font-medium">{e.tool}</span>

                        <Show when={e.detail}>
                          <span class="block truncate text-xs text-ink-3">
                            {e.detail}
                          </span>
                        </Show>
                      </span>

                      <time class="text-xs text-ink-3 tabular-nums">
                        {time(e.at)}
                      </time>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </div>
        </div>
      )}
    </Popover>
  )
}
