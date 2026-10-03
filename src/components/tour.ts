import type { DriveStep } from 'driver.js'

const SEEN = 'polaris-playground:tour-seen'

const STEPS: Array<DriveStep> = [
  {
    popover: {
      title: 'Welcome to Polaris Playground',
      description:
        "Sketch Shopify App Home screens with the real Polaris web components, then take the code with you. Here's a quick look around.",
      showButtons: ['next', 'close'],
    },
  },
  {
    element: '[data-tour="pages"]',
    popover: {
      title: 'Pages',
      description:
        'Each page is one screen of your app. Start blank or from a layout, and export one page or all of them.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="sidebar-tabs"]',
    popover: {
      title: 'Layers and components',
      description:
        'Layers shows how the page is built. Components lists everything Polaris offers, plus anything you save for reuse. Click to insert, or drag into place.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-canvas]',
    popover: {
      title: 'Live preview',
      description:
        "This runs Shopify's own Polaris code. Click a component to select it, or hover one to add, duplicate or delete around it. Nesting rules are checked as you go.",
      // Keep the tour card narrow enough to fit beside the preview.

      side: 'right',
      align: 'start',
      popoverClass: 'pg-tour pg-tour-narrow',
    },
  },
  {
    element: '[data-tour="inspector"]',
    popover: {
      title: 'Inspector',
      description:
        "Edit the selected component's properties and slot, with Shopify's docs a click away. Problems show up here too.",
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="version"]',
    popover: {
      title: 'Polaris v1 or v2',
      description:
        "Compare today's admin design with the 2.0 release candidate. The same page works in both.",
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="export"]',
    popover: {
      title: 'Export',
      description:
        'Copy or download HTML or React JSX. Your work saves in this browser as you go, with no account needed.',
      side: 'bottom',
      align: 'end',
    },
  },
]

let running = false

// Load driver.js only when a tour is requested.
export async function startTour() {
  if (running) {
    return
  }

  running = true

  try {
    const [{ driver }] = await Promise.all([
      import('driver.js'),
      import('driver.js/dist/driver.css'),
    ])
    const tour = driver({
      steps: STEPS,
      showProgress: true,
      progressText: '{{current}} of {{total}}',
      prevBtnText: 'Back',
      nextBtnText: 'Next',
      doneBtnText: 'Start building',
      popoverClass: 'pg-tour',
      stagePadding: 4,
      stageRadius: 10,
      overlayOpacity: 0.5,
      smoothScroll: false,

      onDestroyed: () => {
        running = false

        try {
          localStorage.setItem(SEEN, '1')
        } catch {
          // Storage blocked: the tour may show again next visit.
        }
      },
    })

    tour.drive()
  } catch (e) {
    running = false
    console.error('The tour failed to start', e)
  }
}

export function startTourOnFirstVisit() {
  try {
    if (localStorage.getItem(SEEN)) {
      return
    }
  } catch {
    return
  }

  if (!matchMedia('(min-width: 900px)').matches) {
    return
  }

  // Let the preview paint first so the tour points at a finished screen.
  setTimeout(() => void startTour(), 900)
}
