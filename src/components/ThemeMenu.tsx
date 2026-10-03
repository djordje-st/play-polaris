import { isDark, setTheme, themePref } from '../editor/theme'
import { Icon, Menu } from './ui'

export function ThemeMenu() {
  return (
    <Menu
      align="end"
      trigger={attrs => (
        <button
          {...attrs}
          type="button"
          aria-label="Theme"
          title="Theme"
          class="grid size-8 place-items-center rounded-md text-ink-2 hover:bg-hover hover:text-ink"
        >
          <Icon name={isDark() ? 'moon' : 'sun'} />
        </button>
      )}
      items={[
        {
          label: 'Light',
          icon: 'sun',
          checked: themePref() === 'light',
          onSelect: () => setTheme('light'),
        },
        {
          label: 'Dark',
          icon: 'moon',
          checked: themePref() === 'dark',
          onSelect: () => setTheme('dark'),
        },
        {
          label: 'System',
          icon: 'desktop',
          checked: themePref() === 'system',
          onSelect: () => setTheme('system'),
        },
      ]}
    />
  )
}
