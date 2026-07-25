import { type JSX, Show, createEffect, createMemo, createSignal, onCleanup } from 'solid-js'
import './berlin-paper.css'
import { BERLIN_CATEGORIES, BERLIN_PLACES, type BerlinCategoryKey } from './data/berlinPlaces'
import { DAYS, DAY_BY_KEY, dayPlaceIds, type ItineraryDay } from './data/berlinItinerary'
import { walkMinutesFromHotel } from './utils/walkFromHotel'
import { stopRoute, type StopRoute } from './utils/stopRoute'
import { TopBar } from './ui/TopBar'
import { RouteInfo } from './ui/RouteInfo'
import { Sidebar } from './ui/Sidebar'
import { DayStepper } from './ui/DayStepper'
import { MapLegend } from './ui/MapLegend'
import { FitControl } from './ui/FitControl'
import { ScaleBar } from './ui/ScaleBar'
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

export default function BerlinTripPage(): JSX.Element {
  const [theme, setTheme] = createSignal<'light' | 'dark'>('dark')
  const [tab, setTab] = createSignal<'layers' | 'itinerary'>('layers')
  const [query, setQuery] = createSignal('')
  const [walkable, setWalkable] = createSignal(false)
  const [catOn, setCatOn] = createSignal<ReadonlySet<BerlinCategoryKey>>(new Set(ALL_CATS))
  const [layers, setLayers] = createSignal<BerlinMapLayers>({ ...ALL_LAYERS })
  const [selectedId, setSelectedId] = createSignal<string | null>(null)
  const [activeDayKey, setActiveDayKey] = createSignal<string | null>(null)
  const [tour, setTour] = createSignal(false)
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

  // Auto-advance tour — one point at a time, rolling across days.
  createEffect(() => {
    if (!tour()) return
    const id = setInterval(() => step(1), 2800)
    onCleanup(() => clearInterval(id))
  })

  return (
    <div
      class="berlin-paper flex flex-col"
      data-theme={theme()}
      data-testid="berlin-trip-page"
      style={{ height: '100dvh', overflow: 'hidden' }}
    >
      <TopBar
        tour={tour()}
        theme={theme()}
        onToggleTour={() => setTour((v) => !v)}
        onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
      />

      <div class="flex min-h-0 flex-1">
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
              registerHandle={(h) => (mapHandle = h)}
            />
            <div class="pointer-events-none absolute inset-0">
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
              <div class="pointer-events-none absolute bottom-4 right-4">
                <ScaleBar
                  label={
                    fitPreset() === 'everything' ? '~10 km' : fitPreset() === 'region' ? '~5 km' : '~1 km'
                  }
                />
              </div>
            </div>
          </div>

          <DayStepper
            activeKey={activeDayKey()}
            tour={tour()}
            onPick={selectDay}
            onStep={step}
            onToggleTour={() => setTour((v) => !v)}
          />
        </div>
      </div>
    </div>
  )
}
