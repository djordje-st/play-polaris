import { createSignal } from 'solid-js'

export type ThemePref = 'light' | 'dark' | 'system'

const KEY = 'polaris-playground:theme'

// Set the theme before hydration to avoid a first-paint flash.
export const THEME_SCRIPT = `
  (function () {
    try {
      const theme = localStorage.getItem('${KEY}')

      if (
        theme === 'dark' ||
        (theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)
      ) {
        document.documentElement.classList.add('dark')
      }
    } catch {
      // Blocked storage leaves the initial theme unchanged.
    }
  })()
`

const [pref, setPref] = createSignal<ThemePref>('system')
const [systemDark, setSystemDark] = createSignal(false)

export const themePref = pref

export const isDark = () =>
  pref() === 'dark' || (pref() === 'system' && systemDark())

const apply = () => document.documentElement.classList.toggle('dark', isDark())

let started = false

export function initTheme() {
  if (started) {
    return
  }

  started = true

  const media = matchMedia('(prefers-color-scheme: dark)')

  setSystemDark(media.matches)

  media.addEventListener('change', e => {
    setSystemDark(e.matches)
    apply()
  })

  try {
    const saved = localStorage.getItem(KEY)

    if (saved === 'light' || saved === 'dark') {
      setPref(saved)
    }
  } catch {
    // Storage blocked: stay on the system theme.
  }

  apply()
}

export function setTheme(next: ThemePref) {
  setPref(next)
  apply()

  try {
    if (next === 'system') {
      localStorage.removeItem(KEY)
    } else {
      localStorage.setItem(KEY, next)
    }
  } catch {
    // Storage blocked: the choice lasts for this tab only.
  }
}
