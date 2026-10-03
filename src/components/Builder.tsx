import {
  Show,
  createEffect,
  createResource,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js'
import { useSelector } from '@tanstack/solid-store'
import { DragDropProvider } from '@dnd-kit/solid'
import {
  dismissToast,
  editor,
  initWorkspace,
  loadCatalog,
  setCatalog,
  setSaveState,
} from '../editor/store'
import { loadWorkspace, startSession, takeOver } from '../editor/persistence'
import { handleShortcut, installClipboard } from '../editor/shortcuts'
import {
  dndPlugins,
  dndSensors,
  onDragEnd,
  onDragMove,
  onDragStart,
} from '../editor/dnd'
import { initTheme } from '../editor/theme'
import { modelContext, registerWebMCP } from '../editor/webmcp'
import { Canvas } from './Canvas'
import { InsertPicker } from './InsertPicker'
import { Inspector } from './Inspector'
import { Sidebar } from './Sidebar'
import { Toolbar } from './Toolbar'
import { startTourOnFirstVisit } from './tour'
import { Button, Icon } from './ui'

export function Builder() {
  onMount(initTheme)

  const ready = useSelector(editor, s => s.ready)
  const docVersion = useSelector(editor, s => s.doc.version)
  const [workspace] = createResource(loadWorkspace)

  const version = () =>
    ready()
      ? docVersion()
      : workspace.error
        ? 'v1'
        : (workspace()?.version ?? 'v1')
  const [catalog, { refetch }] = createResource(
    () => !workspace.loading && version(),
    loadCatalog
  )

  createEffect(() => {
    if (catalog.error) {
      return
    }

    const c = catalog()

    if (!c || c.version !== version()) {
      return
    }

    setCatalog(c)

    // A failed read (private mode, blocked storage) still opens a fresh workspace.
    if (!editor.state.ready) {
      initWorkspace(workspace.error ? null : (workspace() ?? null), c)

      if (workspace.error) {
        setSaveState('error')
      }

      void startSession()
    }
  })

  return (
    <Show
      when={ready()}
      fallback={
        <Splash
          error={catalog.error?.message}
          onRetry={() => void refetch()}
        />
      }
    >
      <Workbench loadingVersion={catalog.loading} />
    </Show>
  )
}

function Workbench(props: { loadingVersion: boolean }) {
  const [agentReady, setAgentReady] = createSignal(false)
  const viewing = useSelector(editor, s => s.access === 'viewing')

  onMount(() => {
    const onKey = (e: KeyboardEvent) => handleShortcut(e)

    addEventListener('keydown', onKey)

    const offClipboard = installClipboard()
    // WebMCP polyfills may attach after load; give them a moment.
    let offAgent = registerWebMCP()
    const retry = offAgent
      ? undefined
      : setTimeout(
          () => (offAgent = registerWebMCP()) && setAgentReady(true),
          1500
        )

    setAgentReady(!!offAgent)
    startTourOnFirstVisit()
    onCleanup(() => {
      removeEventListener('keydown', onKey)
      offClipboard()
      clearTimeout(retry)
      offAgent?.()
    })
  })

  return (
    <DragDropProvider
      plugins={dndPlugins}
      sensors={dndSensors}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
    >
      <div class="flex h-dvh min-w-[960px] flex-col overflow-hidden">
        <ViewOnlyBanner />

        {/* A watching tab can look but not touch; inert covers every control. */}
        <div
          class="flex min-h-0 flex-1 flex-col"
          inert={viewing()}
        >
          <Toolbar
            loadingVersion={props.loadingVersion}
            agentReady={agentReady() && !!modelContext()}
          />

          <div class="flex min-h-0 flex-1">
            <Sidebar />

            <main class="flex min-w-0 flex-1">
              <Canvas />
            </main>

            <Inspector />
          </div>
        </div>

        <DragGhost />

        <InsertPicker />

        <Toast />

        <div class="fixed inset-0 z-90 hidden place-items-center bg-chrome p-8 text-center max-[899px]:grid">
          <div class="max-w-xs">
            <p class="font-semibold">PlayPolaris needs a wider window</p>

            <p class="mt-1 text-sm text-ink-2">
              The builder shows layers, a live preview and an inspector side by
              side. Open it on a screen at least 900px wide.
            </p>
          </div>
        </div>
      </div>
    </DragDropProvider>
  )
}

function DragGhost() {
  const drag = useSelector(editor, s => s.drag)

  return (
    <Show when={drag()}>
      {d => (
        <div
          class="pointer-events-none fixed top-0 left-0 z-70 flex max-w-80 flex-col gap-1"
          // Whole pixels: a fractional translate blurs the chip's text.
          style={{
            transform: `translate(${Math.round(d().x) + 14}px, ${Math.round(d().y) + 12}px)`,
          }}
        >
          <span
            class={`inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium shadow-lg ${
              d().target?.error
                ? 'bg-danger text-on-accent'
                : d().target
                  ? 'bg-accent text-on-accent'
                  : 'bg-ink text-panel'
            }`}
          >
            <Icon
              name={d().target?.error ? 'error' : 'grip'}
              size={14}
            />

            {d().label}
          </span>

          <Show when={d().target?.error}>
            <span class="rounded-md bg-panel px-2 py-1 text-xs text-danger shadow-lg">
              {d().target!.error}
            </span>
          </Show>
        </div>
      )}
    </Show>
  )
}

function Toast() {
  const toast = useSelector(editor, s => s.toast)

  return (
    <div
      aria-live="polite"
      class="pointer-events-none fixed inset-x-0 bottom-12 z-80 flex justify-center"
    >
      <Show
        when={toast()}
        keyed
      >
        {t => (
          <div
            class={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium shadow-lg ${
              t.tone === 'critical'
                ? 'bg-danger text-on-accent'
                : 'bg-ink text-panel'
            }`}
          >
            <Icon
              name={t.tone === 'critical' ? 'error' : 'check'}
              size={14}
            />

            {t.message}

            <Show when={t.action}>
              {action => (
                <button
                  type="button"
                  class="pointer-events-auto -my-1 ml-1 rounded px-1.5 py-1 font-semibold underline-offset-2 hover:underline"
                  onClick={() => {
                    dismissToast()
                    action().run()
                  }}
                >
                  {action().label}
                </button>
              )}
            </Show>
          </div>
        )}
      </Show>
    </div>
  )
}

function Splash(props: { error?: string; onRetry: () => void }) {
  return (
    <div class="drafting grid h-dvh place-items-center">
      <div class="w-80 rounded-xl border border-line bg-panel p-6 text-center shadow-sm">
        <svg
          viewBox="0 0 32 32"
          class="mx-auto size-8"
          aria-hidden="true"
        >
          <rect
            width="32"
            height="32"
            rx="8"
            fill="var(--color-accent)"
          />

          <path
            d="M9 9h8a5 5 0 010 10h-4v4H9z"
            fill="white"
          />
        </svg>

        <Show
          when={props.error}
          fallback={
            <p class="mt-3 text-sm text-ink-2">
              Loading the Polaris component catalog…
            </p>
          }
        >
          <p class="mt-3 font-medium">The component catalog didn't load</p>

          <p class="mt-1 text-sm text-ink-2">{props.error}</p>

          <Button
            class="mt-4"
            onClick={() => props.onRetry()}
          >
            Try again
          </Button>
        </Show>
      </div>
    </div>
  )
}

function ViewOnlyBanner() {
  const viewing = useSelector(editor, s => s.access === 'viewing')
  const [busy, setBusy] = createSignal(false)

  return (
    <Show when={viewing()}>
      <div
        role="status"
        class="flex h-11 shrink-0 items-center justify-center gap-3 border-b border-line bg-warn-soft px-4 text-sm"
      >
        <Icon
          name="info"
          size={14}
          class="text-warn"
        />

        <span>
          This workspace is open in another tab. Changes made there show up
          here.
        </span>

        <Button
          size="sm"
          variant="primary"
          disabled={busy()}
          onClick={async () => {
            setBusy(true)
            await takeOver()
            setBusy(false)
          }}
        >
          Edit here instead
        </Button>
      </div>
    </Show>
  )
}
