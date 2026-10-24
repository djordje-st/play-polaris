import { For, Show, createMemo, createSignal } from 'solid-js'
import { useSelector } from '@tanstack/solid-store'
import {
  createProject,
  deleteProject,
  duplicateProject,
  editor,
  openProject,
  renameProject,
  sendPage,
  uniqueProjectName,
} from '../editor/store'
import { Field, TemplatePicker, inputClass } from './dialogs'
import {
  Button,
  Dialog,
  DialogHeader,
  Icon,
  Menu,
  Popover,
  Segmented,
} from './ui'
import type { Version } from '../editor/model'
import type { Project } from '../editor/store'

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

const UNITS = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
] as const

export function edited(at: number, now = Date.now()) {
  const seconds = (at - now) / 1000

  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) {
      return `Edited ${relative.format(Math.round(seconds / size), unit)}`
    }
  }

  return 'Edited just now'
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

const nameTaken = (name: string, except?: string) =>
  editor.state.projects.some(
    p => p.id !== except && p.name.toLowerCase() === name.trim().toLowerCase()
  )

export function ProjectSwitcher() {
  const projects = useSelector(editor, s => s.projects)
  const projectId = useSelector(editor, s => s.projectId)
  const current = () => projects().find(p => p.id === projectId())
  const [query, setQuery] = createSignal('')
  const [renaming, setRenaming] = createSignal<string | null>(null)
  const [creating, setCreating] = createSignal(false)
  // The open project first, then the most recently edited.
  const listed = createMemo(() => {
    const q = query().trim().toLowerCase()

    return projects()
      .filter(p => !q || p.name.toLowerCase().includes(q))
      .sort(
        (a, b) =>
          Number(b.id === projectId()) - Number(a.id === projectId()) ||
          b.updatedAt - a.updatedAt
      )
  })

  return (
    <>
      <Popover
        label="Projects"
        class="w-80 p-0"
        trigger={attrs => (
          <button
            {...attrs}
            type="button"
            data-tour="project"
            title="Switch project"
            class="flex h-8 max-w-56 min-w-0 items-center gap-1.5 rounded-md px-2 font-medium hover:bg-hover"
          >
            <Icon
              name="folder"
              size={14}
              class="text-ink-3"
            />

            <span class="truncate">{current()?.name}</span>

            <Icon
              name="chevronDown"
              size={14}
              class="text-ink-3"
            />
          </button>
        )}
      >
        {close => (
          <div class="text-sm">
            <Show when={projects().length > 5}>
              <div class="border-b border-line p-2">
                <label class="flex h-8 items-center gap-2 rounded-md border border-line bg-chrome px-2 focus-within:border-accent focus-within:bg-panel">
                  <Icon
                    name="search"
                    size={14}
                    class="text-ink-3"
                  />

                  <input
                    type="search"
                    placeholder="Find a project"
                    aria-label="Find a project"
                    class="min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-3"
                    value={query()}
                    onInput={e => setQuery(e.currentTarget.value)}
                    onKeyDown={e => {
                      const first = listed()[0]

                      if (e.key === 'Enter' && first) {
                        openProject(first.id)
                        close()
                      }
                    }}
                  />
                </label>
              </div>
            </Show>

            <ul
              aria-label="Projects"
              class="scroll-thin max-h-80 overflow-y-auto p-1.5"
            >
              <For
                each={listed()}
                fallback={
                  <li class="px-2 py-6 text-center text-ink-3">
                    No project matches “{query()}”.
                  </li>
                }
              >
                {project => (
                  <ProjectRow
                    project={project}
                    active={project.id === projectId()}
                    canDelete={projects().length > 1}
                    renaming={renaming() === project.id}
                    onRename={on => setRenaming(on ? project.id : null)}
                    onOpen={() => {
                      openProject(project.id)
                      close()
                    }}
                  />
                )}
              </For>
            </ul>

            <div class="flex items-center justify-between gap-2 border-t border-line p-2">
              <p class="px-1 text-xs text-ink-3">
                Saved components are shared by all projects.
              </p>

              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  close()
                  setCreating(true)
                }}
              >
                <Icon
                  name="plus"
                  size={14}
                />
                New project
              </Button>
            </div>
          </div>
        )}
      </Popover>

      <NewProjectDialog
        open={creating()}
        onClose={() => setCreating(false)}
      />
    </>
  )
}

function ProjectRow(props: {
  project: Project
  active: boolean
  canDelete: boolean
  renaming: boolean
  onRename: (on: boolean) => void
  onOpen: () => void
}) {
  const [error, setError] = createSignal<string>()
  const commitName = (value: string) => {
    const name = value.trim()

    if (name && name !== props.project.name) {
      if (nameTaken(name, props.project.id)) {
        return setError('Another project already uses this name')
      }

      renameProject(props.project.id, name)
    }

    setError()
    props.onRename(false)
  }

  return (
    <li
      class={`group flex items-center gap-2 rounded-md py-1.5 pr-1 pl-2 ${props.active ? 'bg-accent-soft' : 'hover:bg-hover'}`}
      onDblClick={() => props.onRename(true)}
    >
      <Icon
        name="folder"
        size={14}
        class={props.active ? 'text-accent' : 'text-ink-3'}
      />

      <Show
        when={props.renaming}
        fallback={
          <button
            type="button"
            class="min-w-0 flex-1 text-left"
            aria-current={props.active ? 'true' : undefined}
            onClick={() => props.onOpen()}
          >
            <span class={`block truncate ${props.active ? 'font-medium' : ''}`}>
              {props.project.name}
            </span>

            <span class="block truncate text-xs text-ink-3">
              {plural(props.project.pages.length, 'page')} ·{' '}
              {props.project.version} ·{' '}
              {props.active ? 'Open' : edited(props.project.updatedAt)}
            </span>
          </button>
        }
      >
        <div class="min-w-0 flex-1">
          <input
            ref={el => queueMicrotask(() => el.select())}
            aria-label="Project name"
            aria-invalid={!!error()}
            class="h-7 w-full rounded border border-accent bg-panel px-1.5 outline-none aria-[invalid=true]:border-danger"
            value={props.project.name}
            onInput={() => setError()}
            onBlur={e => commitName(e.currentTarget.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                commitName(e.currentTarget.value)
              }

              if (e.key === 'Escape') {
                setError()
                props.onRename(false)
              }
            }}
          />

          <Show when={error()}>
            <p
              role="alert"
              class="mt-1 text-xs text-danger"
            >
              {error()}
            </p>
          </Show>
        </div>
      </Show>

      <Menu
        align="end"
        trigger={attrs => (
          <button
            type="button"
            {...attrs}
            aria-label={`Actions for ${props.project.name}`}
            class="grid size-6 shrink-0 place-items-center rounded text-ink-3 opacity-0 group-hover:opacity-100 hover:bg-raised hover:text-ink focus-visible:opacity-100 aria-expanded:opacity-100"
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
            onSelect: () => props.onRename(true),
          },
          {
            label: 'Duplicate',
            icon: 'copy',
            onSelect: () => duplicateProject(props.project.id),
          },
          'separator',
          {
            label: 'Delete',
            icon: 'trash',
            danger: true,
            disabled: !props.canDelete,
            onSelect: () => {
              const { name, pages } = props.project

              if (
                window.confirm(
                  `Delete “${name}” and its ${plural(pages.length, 'page')}? This cannot be undone. Export any work you want to keep first.`
                )
              ) {
                deleteProject(props.project.id)
              }
            },
          },
        ]}
      />
    </li>
  )
}

export function NewProjectDialog(props: {
  open: boolean
  onClose: () => void
}) {
  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title="New project"
      width="560px"
    >
      <NewProjectForm onClose={props.onClose} />
    </Dialog>
  )
}

function NewProjectForm(props: { onClose: () => void }) {
  const [name, setName] = createSignal(uniqueProjectName('Untitled project'))
  const [version, setVersion] = createSignal<Version>(editor.state.doc.version)
  const [template, setTemplate] = createSignal('home')
  const error = () =>
    !name().trim()
      ? 'Give the project a name'
      : nameTaken(name())
        ? 'Another project already uses this name'
        : undefined

  return (
    <form
      onSubmit={e => {
        e.preventDefault()

        if (error()) {
          return
        }

        createProject({
          name: name().trim(),
          version: version(),
          template: template(),
        })
        props.onClose()
      }}
    >
      <DialogHeader
        title="New project"
        onClose={props.onClose}
      >
        A separate set of pages, such as one app or one client. Switch projects
        from the toolbar at any time.
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

        <div>
          <p class="mb-1 text-sm font-medium text-ink-2">Polaris version</p>

          <Segmented
            label="Polaris version"
            value={version()}
            onChange={setVersion}
            options={[
              { value: 'v2', label: 'v2, new admin design' },
              { value: 'v1', label: 'v1, previous design' },
            ]}
          />
        </div>

        <TemplatePicker
          value={template()}
          onChange={setTemplate}
        />
      </div>

      <footer class="flex justify-end gap-2 border-t border-line px-5 py-3">
        <Button onClick={props.onClose}>Cancel</Button>

        <Button
          type="submit"
          variant="primary"
          disabled={!!error()}
        >
          Create project
        </Button>
      </footer>
    </form>
  )
}

export function SendPageDialog(props: {
  pageId: string | null
  onClose: () => void
}) {
  return (
    <Dialog
      open={!!props.pageId}
      onClose={props.onClose}
      title="Copy to project"
    >
      <SendPageForm
        pageId={props.pageId!}
        onClose={props.onClose}
      />
    </Dialog>
  )
}

function SendPageForm(props: { pageId: string; onClose: () => void }) {
  const projects = useSelector(editor, s =>
    s.projects.filter(p => p.id !== s.projectId)
  )
  const pages = useSelector(editor, s => s.doc.pages)
  const page = () => pages().find(p => p.id === props.pageId)
  const [target, setTarget] = createSignal(projects()[0]?.id ?? '')
  const send = (move: boolean) => {
    sendPage(props.pageId, target(), move)
    props.onClose()
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        send(false)
      }}
    >
      <DialogHeader
        title="Copy to project"
        onClose={props.onClose}
      >
        Send “{page()?.name}” to another project. The copy is independent of
        this page.
      </DialogHeader>

      <fieldset class="scroll-thin max-h-72 space-y-1 overflow-y-auto px-5 py-4">
        <legend class="sr-only">Project</legend>

        <For each={projects()}>
          {p => (
            <label
              class={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors ${
                target() === p.id
                  ? 'border-accent bg-accent-soft'
                  : 'border-line hover:border-line-strong'
              }`}
            >
              <input
                type="radio"
                name="project"
                class="accent-(--color-accent)"
                checked={target() === p.id}
                onChange={() => setTarget(p.id)}
              />

              <span class="min-w-0 flex-1">
                <span class="block truncate font-medium">{p.name}</span>

                <span class="block text-xs text-ink-3">
                  {plural(p.pages.length, 'page')} · {p.version}
                </span>
              </span>
            </label>
          )}
        </For>
      </fieldset>

      <footer class="flex justify-end gap-2 border-t border-line px-5 py-3">
        <Button onClick={props.onClose}>Cancel</Button>

        <Button
          disabled={!target() || pages().length < 2}
          title={
            pages().length < 2 ? 'A project needs at least one page' : undefined
          }
          onClick={() => send(true)}
        >
          Move
        </Button>

        <Button
          type="submit"
          variant="primary"
          disabled={!target()}
        >
          Copy
        </Button>
      </footer>
    </form>
  )
}
