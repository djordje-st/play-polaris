import { For, Show, createMemo, createSignal, onMount } from 'solid-js'
import { useSelector } from '@tanstack/solid-store'
import { displayName } from '../polaris/catalog'
import { CATEGORIES } from '../polaris/library'
import { allFit, rootTarget, targetAt } from '../editor/dnd'
import { locate } from '../editor/model'
import {
  closeInsert,
  currentPage,
  editor,
  insertComponent,
  insertPreset,
  presetTags,
} from '../editor/store'
import { iconFor } from './Tree'
import { Icon } from './ui'
import type { IconName } from './ui'
import type { DropTarget, Inserting } from '../editor/store'

type Choice = {
  key: string
  label: string
  icon: IconName
  group: string
  insert: (at: DropTarget) => void
  target: DropTarget
}

export function InsertPicker() {
  const inserting = useSelector(editor, s => s.inserting)

  return (
    <Show
      when={inserting()}
      keyed
    >
      {at => <Picker at={at} />}
    </Show>
  )
}

function where(at: Inserting) {
  if (!at.refId) {
    return 'At the end of the page'
  }

  const node = locate(currentPage().nodes, at.refId)?.node
  const name = node ? displayName(node.tag) : 'selection'

  return at.zone === 'inside'
    ? `Inside ${name}`
    : `${at.zone === 'before' ? 'Before' : 'After'} ${name}`
}

function Picker(props: { at: Inserting }) {
  let pop!: HTMLDivElement
  let input!: HTMLInputElement
  let list!: HTMLUListElement
  const [query, setQuery] = createSignal('')
  const [active, setActive] = createSignal(0)
  const catalog = useSelector(editor, s => s.catalog)

  const target = (tag: string) =>
    props.at.refId
      ? targetAt(props.at.refId, props.at.zone, tag, null)
      : rootTarget(tag)

  const presets = useSelector(editor, s => s.presets)

  const matches = createMemo(() => {
    const q = query().trim().toLowerCase()
    const allowed: Array<Choice> = []
    let blocked = 0
    const offer = (text: string, make: () => Choice) => {
      if (q && !text.toLowerCase().includes(q)) {
        return
      }

      const choice = make()

      if (choice.target.error) {
        blocked++
      } else {
        allowed.push(choice)
      }
    }

    for (const p of presets()) {
      const tags = presetTags(p)

      if (!tags[0]) {
        continue
      }

      offer(`${p.name} ${p.description} saved`, () => ({
        key: `preset:${p.id}`,
        label: p.name,
        icon: 'component',
        group: 'Saved',
        target: allFit(target(tags[0]!), tags),
        insert: at => insertPreset(p.id, at),
      }))
    }

    for (const c of CATEGORIES) {
      for (const item of c.items) {
        if (!catalog()?.components[item.tag]) {
          continue
        }

        offer(
          `${item.tag} ${displayName(item.tag)} ${item.blurb} ${c.name}`,
          () => ({
            key: item.tag,
            label: displayName(item.tag),
            icon: iconFor(item.tag),
            group: c.name,
            target: target(item.tag),
            insert: at => insertComponent(item.tag, at),
          })
        )
      }
    }

    return { allowed, blocked }
  })

  const choose = (i: number) => {
    const choice = matches().allowed[i]

    if (!choice) {
      return
    }

    pop.hidePopover()
    choice.insert(choice.target)
  }

  const step = (by: number) => {
    const n = matches().allowed.length

    if (!n) {
      return
    }

    setActive(a => (a + by + n) % n)
    list
      .querySelector(`[data-index="${active()}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }

  onMount(() => {
    pop.showPopover()

    const w = pop.offsetWidth
    const h = pop.offsetHeight
    const below = props.at.y + h + 8 <= innerHeight

    pop.style.left = `${Math.max(8, Math.min(props.at.x, innerWidth - w - 8))}px`
    pop.style.top = `${below ? props.at.y : Math.max(8, props.at.y - h - 32)}px`
    input.focus()
  })

  return (
    <div
      ref={pop}
      popover="auto"
      role="dialog"
      aria-label="Add a component"
      class="menu fixed w-72 p-0"
      onToggle={e => e.newState === 'closed' && closeInsert()}
    >
      <label class="flex h-10 items-center gap-2 border-b border-line px-3">
        <Icon
          name="search"
          size={14}
          class="text-ink-3"
        />

        <input
          ref={input}
          role="combobox"
          aria-expanded="true"
          aria-controls="insert-options"
          aria-activedescendant={`insert-option-${active()}`}
          placeholder="Add a component"
          class="min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-3"
          value={query()}
          onInput={e => {
            setQuery(e.currentTarget.value)
            setActive(0)
          }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') {
              step(1)
            } else if (e.key === 'ArrowUp') {
              step(-1)
            } else if (e.key === 'Enter') {
              choose(active())
            } else {
              return
            }

            e.preventDefault()
          }}
        />
      </label>

      <ul
        ref={list}
        id="insert-options"
        role="listbox"
        aria-label="Components allowed here"
        class="scroll-thin max-h-72 overflow-y-auto p-1"
      >
        <For each={matches().allowed}>
          {(item, i) => (
            <li
              id={`insert-option-${i()}`}
              data-index={i()}
              role="option"
              aria-selected={i() === active()}
              class={`flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 ${
                i() === active() ? 'bg-accent-soft' : ''
              }`}
              onMouseMove={() => setActive(i())}
              onClick={() => choose(i())}
            >
              <Icon
                name={item.icon}
                size={14}
                class={
                  i() === active() || item.group === 'Saved'
                    ? 'text-accent'
                    : 'text-ink-3'
                }
              />

              <span class="flex-1 truncate">{item.label}</span>

              <span class="text-xs text-ink-3">{item.group}</span>
            </li>
          )}
        </For>

        <Show when={!matches().allowed.length}>
          <li class="px-2 py-6 text-center text-sm text-ink-3">
            {query()
              ? 'Nothing that matches can go here.'
              : 'No component can go here.'}
          </li>
        </Show>
      </ul>

      <footer class="flex items-center justify-between gap-2 border-t border-line px-3 py-2 text-xs text-ink-3">
        <span class="truncate">{where(props.at)}</span>

        <Show when={matches().blocked}>
          <span
            class="shrink-0"
            title="Components whose nesting rules don't allow this spot"
          >
            {matches().blocked} not allowed
          </span>
        </Show>
      </footer>
    </div>
  )
}
