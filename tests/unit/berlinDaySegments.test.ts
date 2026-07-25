import { describe, expect, it } from 'vitest'
import { DAY_BY_KEY, type ItineraryDay } from '../../src/data/berlinItinerary'
import { daySegments } from '../../src/utils/daySegments'

describe('daySegments', () => {
  it('opens the arrival day from the hotel through the Gendarmenmarkt loop', () => {
    const segs = daySegments(DAY_BY_KEY['sun'])
    // stop 0 is text-only breakfast; the first mapped stop routes from the hotel
    const first = segs[0]
    expect(first.key).toBe('hilton->gendarmenmarkt')
    expect(first.stopIndex).toBe(1)
    expect(first.mode).toBe('walk')
    // BER is now a mid-day stop, so it gets an incoming (transit) leg
    expect(segs.find((s) => s.toId === 'ber-airport')?.mode).toBe('transit')
    expect(segs.some((s) => s.key === 'ber-airport->hilton')).toBe(true)
  })

  it('gives a day that starts at the airport no incoming leg (you land there)', () => {
    const arrival: ItineraryDay = {
      key: 'x',
      short: 'X',
      date: '—',
      title: 'Land first',
      stops: [
        { label: 'Land at BER', placeId: 'ber-airport' },
        { label: 'Hotel', placeId: 'hilton' },
      ],
    }
    const segs = daySegments(arrival)
    expect(segs.find((s) => s.toId === 'ber-airport')).toBeUndefined()
    expect(segs[0].key).toBe('ber-airport->hilton')
    expect(segs[0].mode).toBe('transit') // ~25 km — way past walking range
  })

  it('starts non-flex days from the hotel', () => {
    const segs = daySegments(DAY_BY_KEY['mon'])
    expect(segs[0].key).toBe('hilton->babbel')
    expect(segs[0].stopIndex).toBe(0)
  })

  it('skips the hotel-origin leg when the day starts at the hotel', () => {
    const segs = daySegments(DAY_BY_KEY['sat'])
    expect(segs).toHaveLength(1)
    expect(segs[0].key).toBe('hilton->ber-airport')
  })

  it('does not give flex-bucket stops a hotel origin', () => {
    const segs = daySegments(DAY_BY_KEY['flex'])
    expect(segs.every((s) => s.fromId !== 'hilton')).toBe(true)
    expect(segs.map((s) => s.key)).toEqual([
      'soviet-memorial->hamburger-bahnhof',
      'hamburger-bahnhof->museum-island',
    ])
  })

  it('classifies short unnoted hops as walks and noted U-Bahn legs as transit', () => {
    const segs = daySegments(DAY_BY_KEY['mon'])
    const byKey = Object.fromEntries(segs.map((s) => [s.key, s]))
    expect(byKey['humboldt-uni->neue-wache'].mode).toBe('walk')
    expect(byKey['neue-wache->bebelplatz'].mode).toBe('walk')
    expect(byKey['babbel->humboldt-uni'].mode).toBe('transit') // "U5 → Museumsinsel"
  })

  it('keeps text-only stops out and preserves stop indices', () => {
    const segs = daySegments(DAY_BY_KEY['fri'])
    // fri stops: hauptbahnhof (0), text-only (1), hilton (2)
    expect(segs.map((s) => [s.key, s.stopIndex])).toEqual([
      ['hilton->hauptbahnhof', 0],
      ['hauptbahnhof->hilton', 2],
    ])
  })
})
