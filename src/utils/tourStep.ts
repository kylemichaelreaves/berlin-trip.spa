/**
 * What the tour card shows at a point in the itinerary: the day's intro
 * (stepper cursor -1) or one stop, with its place, illustration and the
 * labels for the Back / Next buttons. Pure, so the card stays presentational.
 */
import { DAYS, type ItineraryDay, type ItineraryStop } from '../data/berlinItinerary'
import { BERLIN_CATEGORY_BY_KEY, byId, type BerlinCategory, type BerlinPlace } from '../data/berlinPlaces'
import type { BerlinRoute } from '../data/berlinRouteTypes'

/** Sprite art keyed by place id — `PLACE_SPRITES` from data/berlinGeo in the app. */
export type TourSprites = Readonly<Record<string, { url: string; width: number }>>

export type TourIllustration = { url: string; width: number; caption: string }

export type TourNav = { kicker: string; label: string }

export type TourView =
  | { kind: 'intro'; day: ItineraryDay; dayLabel: string; stopCount: number; next: TourNav }
  | {
      kind: 'stop'
      day: ItineraryDay
      index: number
      count: number
      stop: ItineraryStop
      place: BerlinPlace | null
      category: BerlinCategory | null
      illustration: TourIllustration | null
      prev: TourNav
      next: TourNav
    }

/**
 * Stops whose own place has no sprite but sit with a monument that does:
 * Hegel's house, grave and university borrow the Hegel-Denkmal, the Neues
 * Museum its Nofretete. The caption names the monument, so it never passes
 * for a picture of the stop itself.
 */
const BORROWED_SPRITES: Record<string, string> = {
  'hegel-house': 'hegel-denkmal',
  'hegel-grave': 'hegel-denkmal',
  'humboldt-uni': 'hegel-denkmal',
  'neues-museum': 'nofretete',
}

export function tourIllustration(placeId: string | undefined, sprites: TourSprites): TourIllustration | null {
  if (!placeId) return null
  const spriteId = sprites[placeId] ? placeId : BORROWED_SPRITES[placeId]
  const sprite = spriteId ? sprites[spriteId] : undefined
  if (!spriteId || !sprite) return null
  return { ...sprite, caption: byId[spriteId]?.name ?? spriteId }
}

function dayAfter(day: ItineraryDay): ItineraryDay {
  const i = DAYS.findIndex((d) => d.key === day.key)
  return DAYS[(i + 1) % DAYS.length]
}

export function tourView(day: ItineraryDay, stopIndex: number, sprites: TourSprites): TourView {
  const count = day.stops.length
  if (stopIndex < 0 || count === 0) {
    const scheduled = DAYS.filter((d) => !d.flex)
    const dayLabel = day.flex
      ? 'Any day'
      : `Day ${scheduled.findIndex((d) => d.key === day.key) + 1} of ${scheduled.length}`
    const next: TourNav =
      count > 0
        ? { kicker: 'Start · stop 1', label: day.stops[0].label }
        : { kicker: `Next day · ${dayAfter(day).short}`, label: dayAfter(day).title }
    return { kind: 'intro', day, dayLabel, stopCount: count, next }
  }
  const index = Math.min(stopIndex, count - 1)
  const stop = day.stops[index]
  const place = stop.placeId ? (byId[stop.placeId] ?? null) : null
  const prev: TourNav =
    index > 0
      ? { kicker: `Back · stop ${index}`, label: day.stops[index - 1].label }
      : { kicker: 'Back', label: `${day.short} overview` }
  const following = dayAfter(day)
  const next: TourNav =
    index < count - 1
      ? { kicker: `Next · stop ${index + 2}`, label: day.stops[index + 1].label }
      : { kicker: `Next day · ${following.short} ${following.date}`, label: following.title }
  return {
    kind: 'stop',
    day,
    index,
    count,
    stop,
    place,
    category: place ? BERLIN_CATEGORY_BY_KEY[place.category] : null,
    illustration: tourIllustration(stop.placeId, sprites),
    prev,
    next,
  }
}

function formatDistance(meters: number): string {
  return meters < 950 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`
}

/** "U6 → S9 · ~37 min" or "walk · ~4 min · 325 m". */
export function formatRouteSummary(route: BerlinRoute): string {
  const lines = route.legs.filter((l) => l.mode === 'transit' && l.name).map((l) => l.name)
  const head = lines.length ? lines.join(' → ') : 'walk'
  const dist = route.distanceM != null ? ` · ${formatDistance(route.distanceM)}` : ''
  return `${head} · ~${route.durationMin} min${dist}`
}
