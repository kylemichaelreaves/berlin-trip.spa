import { describe, expect, it } from 'vitest'
import { decodePolyline, encodePolyline } from '../../src/utils/polyline'

describe('polyline codec', () => {
  it('round-trips [lng, lat] coordinates at precision 5', () => {
    const coords: [number, number][] = [
      [13.3929, 52.5122],
      [13.40495, 52.52001],
      [-0.12574, 51.50053],
    ]
    expect(decodePolyline(encodePolyline(coords))).toEqual(coords)
  })

  it('round-trips at precision 6', () => {
    const coords: [number, number][] = [
      [13.392901, 52.512199],
      [13.393511, 52.517956],
    ]
    expect(decodePolyline(encodePolyline(coords, 6), 6)).toEqual(coords)
  })

  it('decodes the canonical Google example', () => {
    // https://developers.google.com/maps/documentation/utilities/polylinealgorithm
    expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual([
      [-120.2, 38.5],
      [-120.95, 40.7],
      [-126.453, 43.252],
    ])
  })

  it('handles empty input', () => {
    expect(encodePolyline([])).toBe('')
    expect(decodePolyline('')).toEqual([])
  })
})
