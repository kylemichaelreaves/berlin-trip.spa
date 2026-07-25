/** Home base — walk-from-hotel times are measured from here (Hilton, Gendarmenmarkt). */
export const BERLIN_HOTEL = { lat: 52.5122, lng: 13.3929 }

/** Rough walking minutes from the hotel (~80 m/min). null ⇒ beyond ~45 min ⇒ "transit needed". */
export function walkMinutesFromHotel(place: { lat: number; lng: number }): number | null {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(place.lat - BERLIN_HOTEL.lat)
  const dLng = toRad(place.lng - BERLIN_HOTEL.lng)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(BERLIN_HOTEL.lat)) * Math.cos(toRad(place.lat)) * Math.sin(dLng / 2) ** 2
  const meters = 2 * R * Math.asin(Math.sqrt(a))
  const min = Math.round(meters / 80)
  return min > 45 ? null : min
}
