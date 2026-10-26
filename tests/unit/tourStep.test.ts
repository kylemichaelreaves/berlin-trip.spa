import { describe, expect, it } from 'vitest'
import { DAY_BY_KEY, DAYS } from '../../src/data/berlinItinerary'
import { formatRouteSummary, tourIllustration, tourView, type TourSprites } from '../../src/utils/tourStep'

// Mirrors PLACE_SPRITES in src/data/berlinGeo.ts (which needs a browser to import).
const SPRITES: TourSprites = {
  'hegel-denkmal': { url: '/berlin/hegel-denkmal.svg', width: 96 },
  nofretete: { url: '/berlin/nofretete.svg', width: 96 },
  'berliner-dom': { url: '/berlin/berliner-dom.svg', width: 150 },
}

describe('tourView', () => {
  const sun = DAY_BY_KEY['sun']

  it('opens a day on its intro, pointing at the first stop', () => {
    const v = tourView(sun, -1, SPRITES)
    expect(v.kind).toBe('intro')
    if (v.kind !== 'intro') return
    expect(v.dayLabel).toBe(`Day 1 of ${DAYS.filter((d) => !d.flex).length}`)
    expect(v.stopCount).toBe(sun.stops.length)
    expect(v.next.label).toBe(sun.stops[0].label)
  })

  it('describes a stop with its place, category and neighbours', () => {
    const i = sun.stops.findIndex((s) => s.placeId === 'hegel-house')
    const v = tourView(sun, i, SPRITES)
    expect(v.kind).toBe('stop')
    if (v.kind !== 'stop') return
    expect(v.place?.id).toBe('hegel-house')
    expect(v.category?.key).toBe('philosophy')
    expect(v.prev.label).toBe(sun.stops[i - 1].label)
    expect(v.next.label).toBe(sun.stops[i + 1].label)
    expect(v.next.kicker).toBe(`Next · stop ${i + 2}`)
  })

  it('points the last stop of a day at the next day', () => {
    const v = tourView(sun, sun.stops.length - 1, SPRITES)
    if (v.kind !== 'stop') throw new Error('expected a stop')
    expect(v.next.kicker).toMatch(/^Next day · Mon/)
    expect(v.next.label).toBe(DAY_BY_KEY['mon'].title)
  })

  it('labels the unscheduled bucket as any day', () => {
    const flex = DAYS.find((d) => d.flex)!
    const v = tourView(flex, -1, SPRITES)
    if (v.kind !== 'intro') throw new Error('expected intro')
    expect(v.dayLabel).toBe('Any day')
  })
})

describe('tourIllustration', () => {
  it("uses a place's own sprite, or the monument it sits with", () => {
    expect(tourIllustration('nofretete', SPRITES)?.caption).toMatch(/Nofretete/)
    expect(tourIllustration('hegel-house', SPRITES)?.caption).toMatch(/Hegel-Denkmal/)
    expect(tourIllustration('neues-museum', SPRITES)?.url).toMatch(/nofretete\.svg$/)
  })

  it('returns nothing for stops without art', () => {
    expect(tourIllustration('gendarmenmarkt', SPRITES)).toBeNull()
    expect(tourIllustration(undefined, SPRITES)).toBeNull()
  })
})

describe('formatRouteSummary', () => {
  it('summarises walks and transit lines', () => {
    expect(formatRouteSummary({ durationMin: 4, distanceM: 325, legs: [{ mode: 'walk', points: '' }] })).toBe(
      'walk · ~4 min · 325 m',
    )
    expect(
      formatRouteSummary({
        durationMin: 37,
        legs: [
          { mode: 'transit', name: 'U6', points: '' },
          { mode: 'walk', points: '' },
          { mode: 'transit', name: 'S9', points: '' },
        ],
      }),
    ).toBe('U6 → S9 · ~37 min')
  })
})
