/**
 * The route arriving at a given itinerary stop: its segment (from → to), the
 * precomputed geometry if the generator has it, and decoded legs ready for the
 * map. Falls back to a straight from→to leg so a missing route still draws.
 */
import type { ItineraryDay } from '../data/berlinItinerary'
import { byId } from '../data/berlinPlaces'
import { BERLIN_ROUTES } from '../data/berlinRoutes'
import type { BerlinRoute } from '../data/berlinRouteTypes'
import type { BerlinMapRouteLeg } from '../map/createBerlinMap'
import { daySegments, type DaySegment } from './daySegments'
import { decodePolyline } from './polyline'

export type StopRoute = {
  seg: DaySegment
  route: BerlinRoute | null
  legs: BerlinMapRouteLeg[]
}

export function stopRoute(day: ItineraryDay, stopIndex: number): StopRoute | null {
  const seg = daySegments(day).find((s) => s.stopIndex === stopIndex)
  if (!seg) return null
  const route = BERLIN_ROUTES[seg.key] ?? null
  const from = byId[seg.fromId]
  const to = byId[seg.toId]
  const legs: BerlinMapRouteLeg[] = route
    ? route.legs.map((l) => ({ mode: l.mode, coords: decodePolyline(l.points) }))
    : [
        {
          mode: seg.mode,
          coords: [
            [from.lng, from.lat],
            [to.lng, to.lat],
          ],
        },
      ]
  return { seg, route, legs }
}
