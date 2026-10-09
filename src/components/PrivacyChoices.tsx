import { Show, createSignal, onCleanup, onMount } from 'solid-js'
import {
  ANALYTICS_KEY,
  analyticsChoice,
  privacySignal,
  startAnalytics,
} from '../analytics'
import type { AnalyticsChoice } from '../analytics'

export function PrivacyChoices(props: { inline?: boolean }) {
  const [open, setOpen] = createSignal(false)
  const [blocked, setBlocked] = createSignal(false)
  const [choice, setChoice] = createSignal<AnalyticsChoice | null>(null)
  const [error, setError] = createSignal('')

  onMount(() => {
    const sync = () => {
      setBlocked(privacySignal())
      setChoice(analyticsChoice())
      startAnalytics()
    }

    sync()
    setOpen(!analyticsChoice() && !blocked())
    window.addEventListener('storage', sync)
    onCleanup(() => {
      window.removeEventListener('storage', sync)
    })
  })

  const choose = (selection: AnalyticsChoice) => {
    try {
      localStorage.setItem(ANALYTICS_KEY, selection)
      setChoice(selection)
      startAnalytics()
      setError('')
      setOpen(false)
    } catch {
      setError(
        'Your browser could not save this choice. Optional analytics stays off.'
      )
    }
  }

  return (
    <Show when={props.inline || open()}>
      <div
        class="privacy-choices"
        classList={{ 'privacy-choices-banner': !props.inline }}
        role={props.inline ? 'group' : 'complementary'}
        aria-label="Analytics preferences"
      >
        <div>
          <Show
            when={props.inline}
            fallback={
              <>
                <h2>Help improve PlayPolaris?</h2>
                <p>
                  Optional, cookie-free analytics counts visits and device
                  details.{' '}
                  <a href="/privacy#analytics">Privacy &amp; choices</a>
                </p>
              </>
            }
          >
            <p role="status">
              Optional analytics is{' '}
              {choice() === 'allowed' && !blocked() ? 'on' : 'off'}.
            </p>
          </Show>
          <Show when={blocked()}>
            <p>Your browser’s privacy signal keeps analytics off.</p>
          </Show>
          <Show when={error()}>
            <p role="alert">{error()}</p>
          </Show>
        </div>
        <div class="privacy-choices-actions">
          <button
            type="button"
            onClick={() => choose('denied')}
          >
            Keep analytics off
          </button>
          <button
            type="button"
            disabled={blocked()}
            onClick={() => choose('allowed')}
          >
            Allow analytics
          </button>
        </div>
      </div>
    </Show>
  )
}
