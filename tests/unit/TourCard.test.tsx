import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DAY_BY_KEY } from '../../src/data/berlinItinerary'
import { TourCard } from '../../src/ui/TourCard'
import { stopRoute } from '../../src/utils/stopRoute'
import { tourView, type TourSprites } from '../../src/utils/tourStep'

const SPRITES: TourSprites = {
  'hegel-denkmal': { url: '/berlin/hegel-denkmal.svg', width: 96 },
  nofretete: { url: '/berlin/nofretete.svg', width: 96 },
}
const sun = DAY_BY_KEY['sun']
const at = (placeId: string) => sun.stops.findIndex((s) => s.placeId === placeId)

let dispose: (() => void) | undefined
afterEach(() => {
  dispose?.()
  document.body.innerHTML = ''
})

function mount(stopIndex: number, opts: { autoplay?: boolean; withRoute?: boolean } = {}) {
  const host = document.createElement('div')
  document.body.append(host)
  const onNext = vi.fn()
  const onBack = vi.fn()
  const onToggleAutoplay = vi.fn()
  const view = tourView(sun, stopIndex, SPRITES)
  const route = opts.withRoute === false ? null : stopIndex >= 0 ? stopRoute(sun, stopIndex) : null
  dispose = render(
    () => (
      <TourCard
        view={view}
        route={route}
        autoplay={opts.autoplay ?? false}
        onToggleAutoplay={onToggleAutoplay}
        onNext={onNext}
        onBack={onBack}
      />
    ),
    host,
  )
  const q = (id: string) => host.querySelector<HTMLElement>(`[data-testid="${id}"]`)
  return { host, q, onNext, onBack, onToggleAutoplay }
}

describe('TourCard', () => {
  it('opens a day on its intro: title, stop count, and no Back button', () => {
    const { q, host } = mount(-1)
    expect(q('tour-position')?.textContent).toMatch(/^Day 1 of \d$/)
    expect(q('tour-title')?.textContent).toBe(sun.title)
    expect(host.textContent).toContain(`${sun.stops.length} stops`)
    expect(q('tour-back')).toBeNull()
    expect(q('tour-next')?.textContent).toContain(sun.stops[0].label)
  })

  it('shows a stop with its category, illustration, notes and Back / Next', () => {
    const i = at('hegel-house')
    const { q, host } = mount(i)
    expect(q('tour-position')?.textContent).toBe(`Stop ${i + 1} of ${sun.stops.length}`)
    expect(q('tour-title')?.textContent).toBe(sun.stops[i].label)
    expect(host.textContent).toContain('Philosophy')
    const img = host.querySelector('img')!
    expect(img.getAttribute('src')).toBe('/berlin/hegel-denkmal.svg')
    expect(img.getAttribute('alt')).toMatch(/^Illustration: Hegel-Denkmal/)
    expect(host.textContent).toContain(sun.stops[i].notes!)
    expect(q('tour-back')?.getAttribute('aria-label')).toContain(sun.stops[i - 1].label)
  })

  it('says how you got there, with the precomputed route when there is one', () => {
    const i = at('bebelplatz')
    const { host } = mount(i)
    expect(host.textContent).toContain('Getting there')
    expect(host.textContent).toMatch(/Walk from Gendarmenmarkt · walk · ~\d+ min/)
  })

  it('shows the stop name when it differs from the itinerary label', () => {
    const i = at('hegel-grave')
    const { host } = mount(i)
    expect(host.textContent).toContain("Hegel's grave, Dorotheenstadt Cemetery")
  })

  it('shows a text-only stop without art or a route', () => {
    const { host, q } = mount(0, { withRoute: false })
    expect(host.querySelector('img')).toBeNull()
    expect(host.textContent).not.toContain('Getting there')
    expect(q('tour-title')?.textContent).toBe(sun.stops[0].label)
    expect(host.textContent).toContain(sun.stops[0].time!)
  })

  it('wires Back, Next and autoplay', () => {
    const { q, onNext, onBack, onToggleAutoplay } = mount(at('bebelplatz'))
    q('tour-next')!.click()
    q('tour-back')!.click()
    q('tour-autoplay')!.click()
    expect(onNext).toHaveBeenCalledOnce()
    expect(onBack).toHaveBeenCalledOnce()
    expect(onToggleAutoplay).toHaveBeenCalledOnce()
    expect(q('tour-autoplay')?.getAttribute('aria-label')).toBe('Play through stops')
  })

  it('offers Pause while autoplaying', () => {
    const { q } = mount(1, { autoplay: true })
    expect(q('tour-autoplay')?.getAttribute('aria-label')).toBe('Pause autoplay')
    expect(q('tour-autoplay')?.getAttribute('aria-pressed')).toBe('true')
  })

  it('fills the progress bar up to the current stop', () => {
    const { host } = mount(2)
    const bars = [...host.querySelectorAll<HTMLElement>('[aria-hidden="true"].flex.gap-\\[3px\\] span')]
    expect(bars).toHaveLength(sun.stops.length)
    expect(bars[1]!.style.background).toBe('var(--wf-ink)')
    expect(bars[2]!.style.background).toBe('var(--wf-accent)')
    expect(bars[3]!.style.background).toBe('var(--wf-line)')
  })
})
