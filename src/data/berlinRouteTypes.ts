/**
 * Shape of the precomputed itinerary route geometry in `berlinRoutes.ts`
 * (generated — see `scripts/generateBerlinRoutes.ts`).
 */

export type BerlinRouteLeg = {
  mode: 'walk' | 'transit'
  /** Transit line label, e.g. "S9", "U6", "FEX". */
  name?: string
  /** Encoded polyline (precision 5) of [lng, lat] — decode with `decodePolyline`. */
  points: string
}

export type BerlinRoute = {
  /** Door-to-door minutes (includes transfers and waits on transit routes). */
  durationMin: number
  /** Total meters — walking routes only. */
  distanceM?: number
  /** Streets walked along, in travel order — walking routes only. */
  via?: string[]
  legs: BerlinRouteLeg[]
}
