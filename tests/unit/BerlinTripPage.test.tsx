import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BerlinMapHandle } from '../../src/map/createBerlinMap'
import type { BerlinTripMapProps } from '../../src/map/BerlinTripMap'

// The real map lazy-loads ~1.5 MB of geometry and WebGL. Stand it in with a
// stub that registers a fake handle, and keep its props so a test can
// register a fresh handle the way a resize rebuild does.
const map = vi.hoisted(() => ({ props: null as null | BerlinTripMapProps }))
vi.mock('../../src/map/BerlinTripMap', () => ({
  default: (props: BerlinTripMapProps) => {
    map.props = props
    props.registerHandle(fakeHandle())
    return <div data-testid="map-stub" />
  },
}))

function fakeHandle(): BerlinMapHandle {
  return {
    setSelected: vi.fn(),
    setVisibleCategories: vi.fn(),
    setLayers: vi.fn(),
    setFilterFaded: vi.fn(),
    setDay: vi.fn(),
    setRoute: vi.fn(),
    setCluster: vi.fn(),
    setView3D: vi.fn(),
    projectPoint: vi.fn(() => null),
    zoomBy: vi.fn(),
    fit: vi.fn(),
    fitPlaces: vi.fn(),
    fitCoords: vi.fn(),
    focusPlace: vi.fn(),
    resetView: vi.fn(),
    destroy: vi.fn(),
  }
}

/** matchMedia answering `narrow` for the phone query, with change events. */
function stubMatchMedia(narrow: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>()
  const mql = {
    matches: narrow,
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
  }
  vi.stubGlobal(
    'matchMedia',
    vi.fn((q: string) =>
      q.includes('max-width') ? mql : { matches: false, addEventListener() {}, removeEventListener() {} },
    ),
  )
  return {
    change(next: boolean) {
      mql.matches = next
      for (const cb of listeners) cb({ matches: next } as MediaQueryListEvent)
    },
  }
}

let dispose: (() => void) | undefined
beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('matchMedia', undefined)
})
afterEach(() => {
  dispose?.()
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

async function mount() {
  const { default: BerlinTripPage } = await import('../../src/BerlinTripPage')
  const host = document.createElement('div')
  document.body.append(host)
  dispose = render(() => <BerlinTripPage />, host)
  const q = (id: string) => host.querySelector<HTMLElement>(`[data-testid="${id}"]`)
  const button = (name: RegExp) =>
    [...host.querySelectorAll('button')].find((b) =>
      [b.textContent, b.getAttribute('aria-label'), b.getAttribute('title')].some((t) => name.test(t ?? '')),
    )!
  const key = (k: string) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, cancelable: true }))
  return { host, q, button, key }
}

describe('BerlinTripPage theme', () => {
  it('defaults to dark without a saved choice or a light system preference', async () => {
    const { q } = await mount()
    expect(q('berlin-trip-page')?.dataset.theme).toBe('dark')
  })

  it('follows a light system preference on first visit', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query.includes('light'),
        addEventListener() {},
        removeEventListener() {},
      })),
    )
    const { q } = await mount()
    expect(q('berlin-trip-page')?.dataset.theme).toBe('light')
  })

  it('restores and saves the choice', async () => {
    localStorage.setItem('berlin-trip-theme', 'light')
    const { q, button } = await mount()
    expect(q('berlin-trip-page')?.dataset.theme).toBe('light')
    button(/Toggle light \/ dark/).click()
    expect(q('berlin-trip-page')?.dataset.theme).toBe('dark')
    expect(localStorage.getItem('berlin-trip-theme')).toBe('dark')
  })
})

describe('BerlinTripPage tour mode', () => {
  it('opens on the first day with the map full-bleed', async () => {
    const { q, button, host } = await mount()
    expect(q('berlin-sidebar')).not.toBeNull()
    button(/Tour mode/).click()
    expect(q('tour-card')).not.toBeNull()
    expect(q('tour-title')?.textContent).toBe('Arrival')
    expect(q('berlin-sidebar')).toBeNull()
    expect(host.textContent).toContain('Sun 12 Jul · Arrival')
  })

  it('steps with Next, Back and the arrow keys, and leaves with Esc', async () => {
    const { q, button, key } = await mount()
    button(/Tour mode/).click()
    q('tour-next')!.click()
    expect(q('tour-position')?.textContent).toMatch(/^Stop 1 of/)
    key('ArrowRight')
    expect(q('tour-position')?.textContent).toMatch(/^Stop 2 of/)
    q('tour-back')!.click()
    expect(q('tour-position')?.textContent).toMatch(/^Stop 1 of/)
    key('ArrowLeft')
    expect(q('tour-title')?.textContent).toBe('Arrival')
    key('Enter') // not a tour key: ignored
    expect(q('tour-card')).not.toBeNull()
    key('Escape')
    expect(q('tour-card')).toBeNull()
    expect(q('berlin-sidebar')).not.toBeNull()
  })

  it('ignores arrow keys typed into a field', async () => {
    const { q, button, host } = await mount()
    button(/Tour mode/).click()
    const input = document.createElement('input')
    host.append(input)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(q('tour-title')?.textContent).toBe('Arrival')
  })

  it('autoplays only when asked, and Exit tour stops it', async () => {
    vi.useFakeTimers()
    const { q, button } = await mount()
    button(/Tour mode/).click()
    vi.advanceTimersByTime(3000)
    expect(q('tour-title')?.textContent).toBe('Arrival')
    q('tour-autoplay')!.click()
    vi.advanceTimersByTime(2800)
    expect(q('tour-position')?.textContent).toMatch(/^Stop 1 of/)
    q('tour-exit')!.click()
    expect(q('tour-card')).toBeNull()
  })

  it('switches theme from inside the tour', async () => {
    const { q, button } = await mount()
    button(/Tour mode/).click()
    expect(q('tour-theme')?.getAttribute('aria-label')).toBe('Switch to light theme')
    q('tour-theme')!.click()
    expect(q('berlin-trip-page')?.dataset.theme).toBe('light')
    expect(q('tour-theme')?.getAttribute('aria-label')).toBe('Switch to dark theme')
  })

  it('re-frames the current stop when the map rebuilds mid-tour', async () => {
    const { q, button } = await mount()
    button(/Tour mode/).click()
    const intro = fakeHandle()
    map.props!.registerHandle(intro)
    expect(intro.fitPlaces).toHaveBeenCalled()
    q('tour-next')!.click()
    q('tour-next')!.click() // stop 2: Gendarmenmarkt, the first mapped stop
    const rebuilt = fakeHandle()
    map.props!.registerHandle(rebuilt)
    expect(rebuilt.fitCoords).toHaveBeenCalled()
  })
})

describe('BerlinTripPage on a phone', () => {
  it('hides the sidebar and the legend behind a menu button', async () => {
    stubMatchMedia(true)
    const { q, host } = await mount()
    expect(q('berlin-sidebar')).toBeNull()
    expect(q('berlin-open-panel')).not.toBeNull()
    expect(host.querySelector('.hidden.md\\:block')).not.toBeNull()
  })

  it('opens the drawer, and closes it with ✕, the backdrop or Esc', async () => {
    stubMatchMedia(true)
    const { q, key, host } = await mount()
    q('berlin-open-panel')!.click()
    expect(q('berlin-sidebar-drawer')).not.toBeNull()
    q('berlin-sidebar-close')!.click()
    expect(q('berlin-sidebar-drawer')).toBeNull()

    q('berlin-open-panel')!.click()
    const backdrop = [...host.querySelectorAll('[data-testid="berlin-sidebar-drawer"] > button')].at(
      -1,
    ) as HTMLElement
    backdrop.click()
    expect(q('berlin-sidebar-drawer')).toBeNull()

    q('berlin-open-panel')!.click()
    key('Escape')
    expect(q('berlin-sidebar-drawer')).toBeNull()
  })

  it('closes the drawer when a stop is picked, so the map shows it', async () => {
    stubMatchMedia(true)
    const { q, button, host } = await mount()
    button(/^Sun/).click() // day stepper: Sunday, itinerary tab
    q('berlin-open-panel')!.click()
    const stop = [
      ...host.querySelectorAll<HTMLButtonElement>('[data-testid="berlin-sidebar-drawer"] button'),
    ].find((b) => b.textContent?.includes('Gendarmenmarkt'))!
    stop.click()
    expect(q('berlin-sidebar-drawer')).toBeNull()
  })

  it('switches layout when the viewport crosses the breakpoint', async () => {
    const media = stubMatchMedia(true)
    const { q } = await mount()
    expect(q('berlin-sidebar')).toBeNull()
    media.change(false)
    expect(q('berlin-sidebar')).not.toBeNull()
    expect(q('berlin-open-panel')).toBeNull()
  })
})
