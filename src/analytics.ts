export const ANALYTICS_KEY = 'playpolaris:analytics'

export type AnalyticsChoice = 'allowed' | 'denied'

export function privacySignal() {
  return (
    navigator.doNotTrack === '1' ||
    navigator.doNotTrack === 'yes' ||
    Reflect.get(navigator, 'globalPrivacyControl') === true
  )
}

export function analyticsChoice(): AnalyticsChoice | null {
  try {
    const value = localStorage.getItem(ANALYTICS_KEY)

    return value === 'allowed' || value === 'denied' ? value : null
  } catch {
    return null
  }
}

// Recheck at send time so withdrawal also stops a tracker already in memory.
export function analyticsPayload(
  type: string,
  payload: Record<string, unknown>
) {
  if (
    privacySignal() ||
    analyticsChoice() !== 'allowed' ||
    type !== 'event' ||
    payload.name
  ) {
    return null
  }

  try {
    const url = new URL(String(payload.url), location.origin)
    const titles: Record<string, string> = {
      '/': 'PlayPolaris',
      '/builder': 'Builder · PlayPolaris',
      '/privacy': 'Privacy policy · PlayPolaris',
    }

    if (
      url.origin !== location.origin ||
      !Object.hasOwn(titles, url.pathname)
    ) {
      return null
    }

    return {
      website: payload.website,
      hostname: location.hostname,
      language: payload.language,
      screen: payload.screen,
      title: titles[url.pathname],
      url: url.pathname,
      // The referring origin is useful; its path, query and fragment are not.
      referrer: payload.referrer
        ? new URL(String(payload.referrer), location.origin).origin
        : '',
    }
  } catch {
    return null
  }
}

export function startAnalytics() {
  if (
    privacySignal() ||
    analyticsChoice() !== 'allowed' ||
    location.hostname !== 'playpolaris.dev' ||
    document.getElementById('playpolaris-analytics')
  ) {
    return
  }

  Reflect.set(window, 'playpolarisBeforeSend', analyticsPayload)

  const script = document.createElement('script')

  script.id = 'playpolaris-analytics'
  script.src = 'https://umami-production-5cba.up.railway.app/script.js'
  script.async = true
  script.referrerPolicy = 'no-referrer'
  script.dataset.websiteId = '4a2e8287-6a27-45f5-9e92-c6abbfabe333'
  script.dataset.beforeSend = 'playpolarisBeforeSend'
  script.dataset.excludeSearch = 'true'
  script.dataset.excludeHash = 'true'
  script.dataset.doNotTrack = 'true'
  document.head.append(script)
}
