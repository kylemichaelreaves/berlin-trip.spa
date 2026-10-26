import { type JSX, Show, createEffect, createMemo, createSignal, onCleanup } from 'solid-js'
import './berlin-paper.css'
import { BERLIN_CATEGORIES, BERLIN_PLACES, type BerlinCategoryKey } from './data/berlinPlaces'
import { DAYS, DAY_BY_KEY, dayPlaceIds, type ItineraryDay } from './data/berlinItinerary'
import { walkMinutesFromHotel } from './utils/walkFromHotel'
import { stopRoute, type StopRoute } from './utils/stopRoute'
import { tourView } from './utils/tourStep'
import { PLACE_SPRITES } from './data/berlinGeo'
import { TopBar } from './ui/TopBar'
import { RouteInfo } from './ui/RouteInfo'
import { Sidebar } from './ui/Sidebar'
import { DayStepper } from './ui/DayStepper'
import { MapLegend } from './ui/MapLegend'
import { FitControl } from './ui/FitControl'
import { ScaleBar } from './ui/ScaleBar'
import { Attribution } from './ui/Attribution'
import { TourCard } from './ui/TourCard'
import BerlinTripMap from './map/BerlinTripMap'
import type { BerlinFitPreset, BerlinMapHandle, BerlinMapLayers } from './map/createBerlinMap'

const ALL_CATS = BERLIN_CATEGORIES.map((c) => c.key)
const ALL_LAYERS: BerlinMapLayers = {
  streets: true,
  boroughs: true,
  water: true,
  rail: true,
  wall: true,
  airport: true,
  commute: true,
  daytrip: true,
}

const THEME_KEY = 'berlin-trip-theme'

/** Saved choice, else the system preference. Storage can throw (private mode). */
function initialTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // fall through to the system preference
  }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export default function BerlinTripPage(): JSX.Element {
  const [theme, setTheme] = createSignal<'light' | 'dark'>(initialTheme())
  const [tab, setTab] = createSignal<'layers' | 'itinerary'>('layers')
  const [query, setQuery] = createSignal('')
  const [walkable, setWalkable] = createSignal(false)
  const [catOn, setCatOn] = createSignal<ReadonlySet<BerlinCategoryKey>>(new Set(ALL_CATS))
  const [layers, setLayers] = createSignal<BerlinMapLayers>({ ...ALL_LAYERS })
  const [selectedId, setSelectedId] = createSignal<string | null>(null)
  const [activeDayKey, setActiveDayKey] = createSignal<string | null>(null)
  // Tour mode: the map goes full-bleed with one stop at a time on a card.
  // Autoplay is the old timed walk-through, now opt-in from the card.
  const [tour, setTour] = createSignal(false)
  const [autoplay, setAutoplay] = createSignal(false)
  const [fitPreset, setFitPreset] = createSignal<BerlinFitPreset | null>('city')
  const [cluster, setCluster] = createSignal(true)
  // Stepper cursor within the active day: -1 = whole-day overview, 0..n = a stop.
  const [stopIndex, setStopIndex] = createSignal(-1)

  let mapHandle: BerlinMapHandle | null = null

  const visibleCategories = createMemo(() => catOn())
  const dayIds = createMemo<readonly string[]>(() => {
    const k = activeDayKey()
    return k && DAY_BY_KEY[k] ? dayPlaceIds(DAY_BY_KEY[k]) : []
  })
  const filterFaded = createMemo<ReadonlySet<string>>(() => {
    const q = query().trim().toLowerCase()
    const walk = walkable()
    const out = new Set<string>()
    if (!q && !walk) return out
    for (const p of BERLIN_PLACES) {
      const noMatch = q && !p.name.toLowerCase().includes(q)
      const needsTransit = walk && walkMinutesFromHotel(p) == null
      if (noMatch || needsTransit) out.add(p.id)
    }
    return out
  })
  const activeDay = createMemo<ItineraryDay | null>(() => {
    const k = activeDayKey()
    return k ? (DAY_BY_KEY[k] ?? null) : null
  })
  // Route arriving at the stepper's current stop (null on overview/text-only stops).
  const activeRoute = createMemo<StopRoute | null>(() => {
    const day = activeDay()
    const i = stopIndex()
    return day && i >= 0 ? stopRoute(day, i) : null
  })

  function toggleCat(key: BerlinCategoryKey): void {
    const next = new Set(catOn())
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setCatOn(next)
  }
  function toggleLayer(key: keyof BerlinMapLayers): void {
    setLayers({ ...layers(), [key]: !layers()[key] })
  }
  function dayOverview(day: ItineraryDay): void {
    setSelectedId(null)
    const ids = dayPlaceIds(day)
    if (ids.length) mapHandle?.fitPlaces(ids)
    else mapHandle?.fit('city')
  }
  function focusStop(day: ItineraryDay, i: number): void {
    const s = day.stops[i]
    if (!s) return
    if (s.placeId) {
      setSelectedId(s.placeId)
      // frame the whole incoming leg when there is one, else just the stop
      const r = stopRoute(day, i)
      if (r) mapHandle?.fitCoords(r.legs.flatMap((l) => l.coords))
      else mapHandle?.fitPlaces([s.placeId])
    } else {
      // text-only stop (food / spa / boutique): just highlight in the list
      setSelectedId(null)
    }
  }
  // Pick a whole day → its overview frame, cursor reset to "no stop".
  function selectDay(key: string | null): void {
    setActiveDayKey(key)
    setStopIndex(-1)
    if (key) {
      setTab('itinerary')
      setFitPreset(null)
      dayOverview(DAY_BY_KEY[key])
    }
  }
  function selectStop(i: number): void {
    const day = activeDay()
    if (!day) return
    setStopIndex(i)
    focusStop(day, i)
  }
  // ◀ / ▶ walk through the active day's points, then roll to the adjacent day.
  function step(dir: 1 | -1): void {
    const keys = DAYS.map((d) => d.key)
    const dayKey = activeDayKey()
    if (!dayKey) {
      selectDay(keys[0])
      return
    }
    const day = DAY_BY_KEY[dayKey]
    const i = stopIndex() + dir
    if (i >= day.stops.length) {
      selectDay(keys[(keys.indexOf(dayKey) + 1) % keys.length])
      return
    }
    if (i < -1) {
      const pKey = keys[(keys.indexOf(dayKey) - 1 + keys.length) % keys.length]
      const pDay = DAY_BY_KEY[pKey]
      setActiveDayKey(pKey)
      setTab('itinerary')
      setFitPreset(null)
      setStopIndex(pDay.stops.length - 1)
      focusStop(pDay, pDay.stops.length - 1)
      return
    }
    setStopIndex(i)
    if (i === -1) dayOverview(day)
    else focusStop(day, i)
  }
  function doFit(preset: BerlinFitPreset): void {
    setActiveDayKey(null)
    setStopIndex(-1)
    setFitPreset(preset)
    mapHandle?.fit(preset)
  }

  function startTour(): void {
    setTour(true)
    // Open on a day: the active one, else the first. Its intro card shows
    // until the visitor steps on.
    if (!activeDayKey()) selectDay(DAYS[0].key)
  }
  function exitTour(): void {
    setTour(false)
    setAutoplay(false)
  }
  function toggleTour(): void {
    if (tour()) exitTour()
    else startTour()
  }
  // Re-frame the current stop: hiding the sidebar resizes the map, and the
  // map rebuilds its scene (and handle) after a resize.
  function refocus(): void {
    const day = activeDay()
    if (!day) return
    const i = stopIndex()
    if (i >= 0) focusStop(day, i)
    else dayOverview(day)
  }

  createEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme())
    } catch {
      // the toggle still works for this visit
    }
  })

  // Autoplay — one point at a time, rolling across days.
  createEffect(() => {
    if (!tour() || !autoplay()) return
    const id = setInterval(() => step(1), 2800)
    onCleanup(() => clearInterval(id))
  })

  // ← / → step and Esc leaves while touring (not while typing in a field).
  createEffect(() => {
    if (!tour()) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'Escape') exitTour()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    onCleanup(() => window.removeEventListener('keydown', onKey))
  })

  const tourCardView = createMemo(() => {
    const day = activeDay()
    return tour() && day ? tourView(day, stopIndex(), PLACE_SPRITES) : null
  })

  return (
    <div
      class="berlin-paper flex flex-col"
      data-theme={theme()}
      data-testid="berlin-trip-page"
      style={{ height: '100dvh', overflow: 'hidden' }}
    >
      <Show when={!tour()}>
        <TopBar
          tour={tour()}
          theme={theme()}
          onToggleTour={toggleTour}
          onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
        />
      </Show>

      <div class="flex min-h-0 flex-1">
        <Show when={!tour()}>
          <Sidebar
            tab={tab()}
            setTab={setTab}
            query={query()}
            setQuery={setQuery}
            walkable={walkable()}
            setWalkable={setWalkable}
            catOn={catOn()}
            toggleCat={toggleCat}
            layers={layers()}
            toggleLayer={toggleLayer}
            activeDay={activeDay()}
            activeStopIndex={stopIndex()}
            onPickStop={selectStop}
          />
        </Show>

        <div class="flex min-w-0 flex-1 flex-col">
          <div class="relative min-h-0 flex-1">
            <BerlinTripMap
              layers={layers}
              visibleCategories={visibleCategories}
              filterFaded={filterFaded}
              dayIds={dayIds}
              route={() => activeRoute()?.legs ?? null}
              cluster={cluster}
              selectedId={selectedId}
              onSelect={setSelectedId}
              registerHandle={(h) => {
                const first = mapHandle === null
                mapHandle = h
                if (!first && tour()) refocus()
              }}
            />
            <Show when={tourCardView()} keyed>
              {(view) => (
                <div class="pointer-events-none absolute inset-0 z-20" data-testid="tour-overlay">
                  <div class="pointer-events-auto absolute left-3 top-[52px] flex items-center gap-2 md:left-6 md:top-[60px]">
                    <button
                      type="button"
                      onClick={exitTour}
                      class="flex h-11 items-center gap-2 rounded-[10px] pl-3 pr-4 text-sm"
                      style={{
                        background: 'var(--wf-glass)',
                        border: '1.5px solid var(--wf-line)',
                        color: 'var(--wf-ink)',
                      }}
                      data-testid="tour-exit"
                    >
                      <svg
                        aria-hidden="true"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                      >
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                      Exit tour
                    </button>
                    <span
                      class="wf-mono hidden rounded-lg px-3 py-2 text-xs uppercase tracking-[0.08em] sm:inline"
                      style={{ background: 'var(--wf-glass)', color: 'var(--wf-ink-2)' }}
                    >
                      {view.day.short} {view.day.date} · {view.day.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
                      aria-label={theme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                      class="flex size-11 items-center justify-center rounded-[10px] text-base"
                      style={{
                        background: 'var(--wf-glass)',
                        border: '1.5px solid var(--wf-line)',
                        color: 'var(--wf-ink)',
                      }}
                      data-testid="tour-theme"
                    >
                      <Show
                        when={theme() === 'dark'}
                        fallback={
                          <svg
                            aria-hidden="true"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.8"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
                          </svg>
                        }
                      >
                        <svg
                          aria-hidden="true"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                        >
                          <circle cx="12" cy="12" r="4" />
                          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                        </svg>
                      </Show>
                    </button>
                  </div>
                  <TourCard
                    view={view}
                    route={activeRoute()}
                    autoplay={autoplay()}
                    onToggleAutoplay={() => setAutoplay((v) => !v)}
                    onNext={() => step(1)}
                    onBack={() => step(-1)}
                  />
                </div>
              )}
            </Show>
            <div class="pointer-events-none absolute inset-0" classList={{ hidden: tour() }}>
              <Show when={activeRoute()} keyed>
                {(r) => (
                  <div class="absolute left-1/2 top-3.5 -translate-x-1/2">
                    <RouteInfo seg={r.seg} route={r.route} />
                  </div>
                )}
              </Show>
              <div class="pointer-events-auto absolute bottom-3.5 left-3.5">
                <MapLegend catOn={catOn()} toggleCat={toggleCat} />
              </div>
              <div class="pointer-events-auto absolute right-3.5 top-3.5">
                <FitControl
                  preset={fitPreset()}
                  cluster={cluster()}
                  onZoom={(f) => mapHandle?.zoomBy(f)}
                  onFit={doFit}
                  onToggleCluster={() => setCluster((v) => !v)}
                />
              </div>
              <div class="pointer-events-none absolute bottom-4 right-4 flex flex-col items-end gap-1.5">
                <ScaleBar
                  label={
                    fitPreset() === 'everything' ? '~10 km' : fitPreset() === 'region' ? '~5 km' : '~1 km'
                  }
                />
                {/* Links need clicks; the wrapper is pointer-events-none. */}
                <div class="pointer-events-auto">
                  <Attribution />
                </div>
              </div>
            </div>
          </div>

          <Show when={!tour()}>
            <DayStepper
              activeKey={activeDayKey()}
              tour={tour()}
              onPick={selectDay}
              onStep={step}
              onToggleTour={toggleTour}
            />
          </Show>
        </div>
      </div>
    </div>
  )
}
