/**
 * Google encoded-polyline codec (variable precision).
 *
 * The precomputed itinerary routes in `data/berlinRoutes.ts` store one encoded
 * string per leg instead of hundreds of coordinate pairs — decode on use.
 * Coordinates are [lng, lat] pairs (GeoJSON order, matching `berlinGeo`); the
 * wire format itself stores lat first, per the polyline spec.
 */

export function encodePolyline(coords: readonly [number, number][], precision = 5): string {
  const factor = 10 ** precision
  let out = ''
  let prevLat = 0
  let prevLng = 0
  for (const [lng, lat] of coords) {
    const iLat = Math.round(lat * factor)
    const iLng = Math.round(lng * factor)
    out += encodeValue(iLat - prevLat) + encodeValue(iLng - prevLng)
    prevLat = iLat
    prevLng = iLng
  }
  return out
}

function encodeValue(value: number): string {
  let n = value < 0 ? ~(value << 1) : value << 1
  let out = ''
  while (n >= 0x20) {
    out += String.fromCharCode((0x20 | (n & 0x1f)) + 63)
    n >>= 5
  }
  return out + String.fromCharCode(n + 63)
}

export function decodePolyline(encoded: string, precision = 5): [number, number][] {
  const factor = 10 ** precision
  const coords: [number, number][] = []
  let index = 0
  let lat = 0
  let lng = 0
  const next = (): number => {
    let result = 0
    let shift = 0
    let b: number
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    return result & 1 ? ~(result >> 1) : result >> 1
  }
  while (index < encoded.length) {
    lat += next()
    lng += next()
    coords.push([lng / factor, lat / factor])
  }
  return coords
}
