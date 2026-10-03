// @vitest-environment happy-dom

import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { mount, button } from '../test/dom'

const { driver, drive } = vi.hoisted(() => ({
  driver: vi.fn(),
  drive: vi.fn(),
}))

vi.mock('driver.js', () => ({ driver }))

beforeEach(() => {
  vi.resetModules()
  vi.useFakeTimers()
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  driver.mockReset().mockReturnValue({ drive })
  drive.mockReset()
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

test.each([null, 'light', 'dark'] as const)(
  'theme initializes from %s and responds to system changes and menu choices',
  async saved => {
    const media = new EventTarget()

    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => Object.assign(media, { matches: true }))
    )

    if (saved) {
      localStorage.setItem('polaris-playground:theme', saved)
    }

    const theme = await import('../editor/theme')

    theme.initTheme()
    theme.initTheme()
    expect(matchMedia).toHaveBeenCalledOnce()
    expect(theme.isDark()).toBe(saved !== 'light')
    expect(document.documentElement.classList.contains('dark')).toBe(
      saved !== 'light'
    )

    const { ThemeMenu } = await import('./ThemeMenu')
    const root = mount(() => <ThemeMenu />)

    button('Light', root).click()
    expect(theme.isDark()).toBe(false)
    expect(localStorage.getItem('polaris-playground:theme')).toBe('light')
    button('Dark', root).click()
    expect(theme.isDark()).toBe(true)
    button('System', root).click()
    expect(localStorage.getItem('polaris-playground:theme')).toBeNull()
    media.dispatchEvent(Object.assign(new Event('change'), { matches: false }))
    expect(theme.isDark()).toBe(false)
  }
)

test('blocked storage does not prevent theme changes or break the first-paint script', async () => {
  vi.stubGlobal('localStorage', {
    getItem: () => {
      throw new Error('Blocked')
    },
    setItem: () => {
      throw new Error('Blocked')
    },
  })

  const theme = await import('../editor/theme')

  theme.initTheme()
  theme.setTheme('dark')
  expect(document.documentElement.classList.contains('dark')).toBe(true)
  expect(() => new Function(theme.THEME_SCRIPT)()).not.toThrow()
})

test.each([
  [null, true, true],
  ['light', true, false],
  ['dark', false, true],
  ['invalid', false, false],
] as const)(
  'first-paint theme %s, system %s matches %s',
  async (saved, system, expected) => {
    vi.stubGlobal('matchMedia', () => ({ matches: system }))

    if (saved) {
      localStorage.setItem('polaris-playground:theme', saved)
    }

    const { THEME_SCRIPT } = await import('../editor/theme')

    new Function(THEME_SCRIPT)()
    expect(document.documentElement.classList.contains('dark')).toBe(expected)
  }
)

test('tour starts once, records completion, and can be restarted manually', async () => {
  const { startTour } = await import('./tour')

  await Promise.all([startTour(), startTour()])
  expect(drive).toHaveBeenCalledOnce()

  const config = driver.mock.calls[0]![0] as {
    steps: unknown[]
    onDestroyed: () => void
  }

  expect(config.steps).toHaveLength(7)
  config.onDestroyed()
  expect(localStorage.getItem('polaris-playground:tour-seen')).toBe('1')
  await startTour()
  expect(drive).toHaveBeenCalledTimes(2)
  vi.stubGlobal('localStorage', {
    setItem: () => {
      throw new Error('Blocked')
    },
  })
  expect(() => config.onDestroyed()).not.toThrow()
})

test('tour failures release the running guard so a retry works', async () => {
  drive.mockImplementationOnce(() => {
    throw new Error('Unavailable')
  })

  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  const { startTour } = await import('./tour')

  await startTour()
  expect(error).toHaveBeenCalledWith(
    'The tour failed to start',
    expect.any(Error)
  )
  await startTour()
  expect(drive).toHaveBeenCalledTimes(2)
})

test.each(['first', 'seen', 'small', 'blocked'])(
  'automatic tour handles a %s visit',
  async visit => {
    vi.stubGlobal('matchMedia', () => ({ matches: visit !== 'small' }))

    if (visit === 'seen') {
      localStorage.setItem('polaris-playground:tour-seen', '1')
    }

    if (visit === 'blocked') {
      vi.stubGlobal('localStorage', {
        getItem: () => {
          throw new Error('Blocked')
        },
      })
    }

    const { startTourOnFirstVisit } = await import('./tour')

    startTourOnFirstVisit()
    expect(drive).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000)

    if (visit === 'first') {
      await vi.waitFor(() => expect(drive).toHaveBeenCalledOnce())
    } else {
      expect(drive).not.toHaveBeenCalled()
    }
  }
)
