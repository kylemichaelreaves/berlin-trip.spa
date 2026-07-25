/**
 * Point-to-point legs ("segments") for a day's mapped itinerary stops.
 *
 * Stepping through a day means arriving somewhere from somewhere: each mapped
 * stop after the first gets a segment from the previous mapped stop, and
 * non-flex days start from the hotel. A segment's `key` looks up precomputed
 * geometry in `data/berlinRoutes.ts` (regenerate with
 * `bun run scripts/generateBerlinRoutes.ts` after itinerary edits).
 */
import type { ItineraryDay } from '../data/berlinItinerary'
import { byId } from '../data/berlinPlaces'
import { haversineMeters } from './haversineMeters'

export type SegmentMode = 'walk' | 'transit'

export type DaySegment = {
  /** `${fromId}->${toId}` — key into `BERLIN_ROUTES`. */
  key: string
  fromId: string
  toId: string
  /** Index of the arriving stop in `day.stops`. */
  stopIndex: number
  mode: SegmentMode
  /** The arriving stop's "getting there" note, if any. */
  transitNote?: string
}

const HOTEL_ID = 'hilton'
const AIRPORT_ID = 'ber-airport'
/** Legs longer than this as the crow flies are assumed to need transit. */
const MAX_WALK_METERS = 2200
const TRANSIT_NOTE_RE = /\b(?:U\d+|S\d+|M\d+|RE\d*|FEX|U-Bahn|S-Bahn|tram|bus)\b/i

function segmentMode(fromId: string, toId: string, note: string | undefined): SegmentMode {
  if (note && TRANSIT_NOTE_RE.test(note)) return 'transit'
  return haversineMeters(byId[fromId], byId[toId]) <= MAX_WALK_METERS ? 'walk' : 'transit'
}

/**
 * Segments for a day, in stop order. Non-flex days start from the hotel —
 * unless the first mapped stop is the hotel itself, or the airport (arrival
 * day: you land there, nothing precedes it).
 */
export function daySegments(day: ItineraryDay): DaySegment[] {
  const out: DaySegment[] = []
  let prevId: string | null = day.flex ? null : HOTEL_ID
  let first = true
  day.stops.forEach((s, stopIndex) => {
    if (!s.placeId || !byId[s.placeId]) return
    const fromId = first && s.placeId === AIRPORT_ID ? null : prevId
    first = false
    prevId = s.placeId
    if (!fromId || fromId === s.placeId) return
    out.push({
      key: `${fromId}->${s.placeId}`,
      fromId,
      toId: s.placeId,
      stopIndex,
      mode: segmentMode(fromId, s.placeId, s.transit),
      transitNote: s.transit,
    })
  })
  return out
}
