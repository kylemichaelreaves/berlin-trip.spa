import { DAYS } from '../data/berlinItinerary'

/** Human labels of the itinerary days a place appears on (e.g. ["Tue 14 Jul"]). */
export function placeDays(id: string): string[] {
  return DAYS.filter((d) => d.stops.some((s) => s.placeId === id)).map((d) => `${d.short} ${d.date}`)
}
