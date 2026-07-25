/**
 * D3 Berlin trip map — real geometry, paper-wireframe styling.
 *
 * Basemap layers live inside a zoomed `root` group (districts, water, roads,
 * rail network, the Wall, plus the three itinerary "trip lines"). Place markers
 * live in a separate screen-space `overlay` group that is repainted on every
 * zoom tick — so pins keep constant size, overlapping pins collapse into count
 * bubbles, and the active day's stops draw on top as numbered pins.
 *
 * Themeable colours are set with `.style(..., 'var(--wf-*)')` so toggling the
 * paper light/dark theme re-colours the map live without a rebuild.
 */
import * as d3 from 'd3'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import {
  BERLIN_CATEGORY_BY_KEY,
  BERLIN_CATEGORIES,
  byId,
  type BerlinCategoryKey,
  type BerlinPlace,
} from '../data/berlinPlaces'
import type { BerlinGeo, LineProps } from '../data/berlinGeo'
import { shapeNode } from '../data/berlinShapes'

export type BerlinMapCallbacks = {
  onLineEnter: (label: string, event: PointerEvent) => void
  onLineMove: (label: string, event: PointerEvent) => void
  onLineLeave: () => void
  onPinEnter: (place: BerlinPlace, event: PointerEvent) => void
  onPinLeave: () => void
  onPinClick: (place: BerlinPlace, screenX: number, screenY: number) => void
}

export type BerlinMapLayers = {
  streets: boolean
  boroughs: boolean
  water: boolean
  rail: boolean
  wall: boolean
  airport: boolean
  commute: boolean
  daytrip: boolean
}

export type BerlinFitPreset = 'city' | 'region' | 'everything'

/** One decoded leg of the active itinerary route ([lng, lat] pairs). */
export type BerlinMapRouteLeg = {
  mode: 'walk' | 'transit'
  coords: readonly [number, number][]
}

export type BerlinMapHandle = {
  setSelected: (id: string | null) => void
  setVisibleCategories: (keys: ReadonlySet<BerlinCategoryKey>) => void
  setLayers: (layers: BerlinMapLayers) => void
  setFilterFaded: (ids: ReadonlySet<string>) => void
  /** Ordered stop ids for the active day (numbered pins + auto-fade others). */
  setDay: (orderedIds: readonly string[]) => void
  /** Route for the active itinerary leg — walk legs dotted, transit solid. */
  setRoute: (legs: readonly BerlinMapRouteLeg[] | null) => void
  setCluster: (on: boolean) => void
  zoomBy: (factor: number) => void
  fit: (preset: BerlinFitPreset) => void
  fitPlaces: (ids: readonly string[]) => void
  fitCoords: (coords: readonly [number, number][]) => void
  focusPlace: (id: string) => void
  resetView: () => void
  destroy: () => void
}

const PADDING = 26
const PIN = 22
const CLICK_DIST_SQ = 25

const FIT_BOUNDS: Record<BerlinFitPreset, [number, number, number, number]> = {
  // [minLng, minLat, maxLng, maxLat]
  city: [13.355, 52.498, 13.425, 52.532],
  region: [13.3, 52.47, 13.51, 52.55],
  everything: [13.15, 52.35, 13.52, 52.78],
}

export function createBerlinMap(
  svgEl: SVGSVGElement,
  geo: BerlinGeo,
  width: number,
  height: number,
  callbacks: BerlinMapCallbacks,
): BerlinMapHandle {
  const { districts, water, roads, transit, wall } = geo
  const svg = d3.select(svgEl)
  svg.selectAll('*').remove()
  svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', width).attr('height', height)

  // Projection fit to districts + all place points (so outliers are reachable).
  const placePoints: Feature<Geometry>[] = Object.values(byId).map((p) => ({
    type: 'Feature',
    properties: {},
    geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
  }))
  const fitTarget: FeatureCollection<Geometry> = {
    type: 'FeatureCollection',
    features: [...districts.features, ...placePoints] as Feature<Geometry>[],
  }
  const projection = d3.geoMercator().fitExtent(
    [
      [PADDING, PADDING],
      [width - PADDING, height - PADDING],
    ],
    fitTarget,
  )
  const path = d3.geoPath(projection)
  const project = (p: { lng: number; lat: number }): [number, number] =>
    projection([p.lng, p.lat]) ?? [-9999, -9999]

  const root = svg.append('g').attr('data-role', 'berlin-map-root')

  // ── Basemap ───────────────────────────────────────────────
  const districtsLayer = root.append('g').attr('data-role', 'boroughs')
  districtsLayer
    .selectAll('path')
    .data(districts.features)
    .join('path')
    .attr('d', (f) => path(f) ?? '')
    .attr('fill', 'none')
    .style('stroke', 'var(--wf-ink)')
    .attr('stroke-width', 1.4)
    .attr('stroke-dasharray', '6 4')
    .attr('opacity', 0.55)
    .attr('vector-effect', 'non-scaling-stroke')
  // Borough labels are counter-scaled on zoom (see applyLabelScale) so they
  // stay a constant size instead of ballooning at high zoom.
  const labelCentroids = districts.features.map((f) => path.centroid(f))
  const labels = districtsLayer
    .selectAll('text')
    .data(districts.features)
    .join('text')
    .attr('text-anchor', 'middle')
    .attr('font-size', 9)
    .attr('font-family', 'ui-monospace, monospace')
    .attr('letter-spacing', 0.5)
    .attr('opacity', 0.55)
    .style('fill', 'var(--wf-muted)')
    .attr('pointer-events', 'none')
    .text((f) => f.properties.name)
  function applyLabelScale(k: number): void {
    labels.attr('transform', (_f, i) => {
      const [cx, cy] = labelCentroids[i]
      return `translate(${cx},${cy}) scale(${1 / k})`
    })
  }
  applyLabelScale(1)

  // Water = river/canal centerlines (continuous) drawn UNDER the fill polygons
  // (true width where mapped). OSM only maps the Spree's through-channel as a
  // centerline through the Spreebogen — the fill polygons cover just the basins
  // — so a polygons-only render looks disconnected by the Reichstag. The
  // centerline reconnects it. Everything sits in one opacity group so the
  // line/polygon overlaps don't composite into darker bands.
  // River stroke width ≈ a constant real-world width (~85 m): scaling stroke
  // (no non-scaling) so it tracks zoom like the projected geometry.
  const wRef = projection([13.376, 52.52])
  const wRef2 = projection([13.376, 52.52 + 85 / 111320])
  const riverWidth = wRef && wRef2 ? Math.max(0.6, Math.abs(wRef[1] - wRef2[1])) : 2
  const canalWidth = riverWidth * 0.5

  const waterLayer = root.append('g').attr('data-role', 'water')
  const waterFill = waterLayer.append('g').attr('opacity', 0.85)
  // centerlines under the fill
  waterFill
    .selectAll('path.berlin-waterline')
    .data(water.features.filter((f) => f.properties.k === 'river' || f.properties.k === 'canal'))
    .join('path')
    .attr('class', 'berlin-waterline')
    .attr('d', (f) => path(f) ?? '')
    .attr('fill', 'none')
    .style('stroke', 'var(--wf-water)')
    .attr('stroke-width', (f) => (f.properties.k === 'canal' ? canalWidth : riverWidth))
    .attr('stroke-linecap', 'round')
    .attr('stroke-linejoin', 'round')
  // fill polygons over the centerlines (true width where OSM maps the area)
  const waterPolys = water.features.filter((f) => f.geometry.type === 'Polygon')
  const waterMulti: Feature<Geometry> = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'MultiPolygon',
      coordinates: waterPolys.map((f) => (f.geometry as { coordinates: number[][][] }).coordinates),
    },
  }
  waterFill
    .append('path')
    .attr('d', path(waterMulti) ?? '')
    .style('fill', 'var(--wf-water)')
    .style('stroke', 'var(--wf-water)')
    .attr('stroke-width', 0.6)
    .attr('stroke-linejoin', 'round')
    .attr('vector-effect', 'non-scaling-stroke')

  const roadsLayer = root.append('g').attr('data-role', 'streets')
  roadsLayer
    .selectAll('path')
    .data(roads.features)
    .join('path')
    .attr('d', (f) => path(f) ?? '')
    .attr('fill', 'none')
    .style('stroke', 'var(--wf-line)')
    .attr('stroke-opacity', (f) => (f.properties.c === 'major' ? 1 : 0.7))
    .attr('stroke-width', (f) => (f.properties.c === 'major' ? 1.5 : 0.8))
    .attr('vector-effect', 'non-scaling-stroke')

  const railLayer = root.append('g').attr('data-role', 'rail')
  railLayer
    .selectAll('path')
    .data(transit.features)
    .join('path')
    .attr('d', (f) => path(f) ?? '')
    .attr('fill', 'none')
    .style('stroke', 'var(--wf-muted)')
    .attr('stroke-opacity', 0.85)
    .attr('stroke-width', 1.4)
    .attr('stroke-dasharray', (f) => (f.properties.net === 'sbahn' ? '2 4' : null))
    .attr('stroke-linecap', 'round')
    .attr('vector-effect', 'non-scaling-stroke')

  const wallLayer = root.append('g').attr('data-role', 'wall')
  wallLayer
    .selectAll('path')
    .data(wall.features)
    .join('path')
    .attr('d', (f) => path(f) ?? '')
    .attr('fill', 'none')
    .style('stroke', 'var(--wf-ink)')
    .attr('stroke-opacity', 0.8)
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '5 4')
    .attr('stroke-linecap', 'round')
    .attr('vector-effect', 'non-scaling-stroke')

  // ── Trip lines (itinerary) ────────────────────────────────
  const tripLayer = root.append('g').attr('data-role', 'trip-lines')
  const seg = (aId: string, bId: string, curve = 0.2): string => {
    const a = project(byId[aId])
    const b = project(byId[bId])
    const mx = (a[0] + b[0]) / 2
    const my = (a[1] + b[1]) / 2 - Math.abs(b[0] - a[0]) * curve
    return `M ${a[0]} ${a[1]} Q ${mx} ${my} ${b[0]} ${b[1]}`
  }
  const airportLine = tripLayer
    .append('path')
    .attr('d', byId['ber-airport'] && byId['hbf'] ? seg('ber-airport', 'hauptbahnhof', 0.12) : '')
    .attr('fill', 'none')
    .style('stroke', 'var(--wf-ink)')
    .attr('stroke-width', 2.2)
    .attr('opacity', 0.75)
    .attr('vector-effect', 'non-scaling-stroke')
  const commuteLine = tripLayer
    .append('path')
    .attr(
      'd',
      `M ${project(byId['hilton'])[0]} ${project(byId['hilton'])[1]} L ${project(byId['babbel'])[0]} ${project(byId['babbel'])[1]}`,
    )
    .attr('fill', 'none')
    .style('stroke', 'var(--wf-accent)')
    .attr('stroke-width', 2.4)
    .attr('vector-effect', 'non-scaling-stroke')
  const daytripLine = tripLayer
    .append('path')
    .attr('d', seg('hauptbahnhof', 'sachsenhausen', 0.18))
    .attr('fill', 'none')
    .style('stroke', 'var(--wf-ink)')
    .attr('stroke-width', 2.2)
    .attr('stroke-dasharray', '7 5')
    .attr('opacity', 0.75)
    .attr('vector-effect', 'non-scaling-stroke')

  // ── Active itinerary route (walk/transit legs, set via setRoute) ──
  const routeLayer = root.append('g').attr('data-role', 'route')
  function setRoute(legs: readonly BerlinMapRouteLeg[] | null): void {
    routeLayer.selectAll('*').remove()
    if (!legs?.length) return
    const line = d3.line()
    const ds = legs
      .map((leg) => ({ leg, d: line(leg.coords.map(([lng, lat]) => project({ lng, lat }))) }))
      .filter((x): x is { leg: BerlinMapRouteLeg; d: string } => Boolean(x.d))
    // paper-coloured casing under every leg so the route reads over busy streets
    for (const { d } of ds) {
      routeLayer
        .append('path')
        .attr('d', d)
        .attr('fill', 'none')
        .style('stroke', 'var(--wf-paper)')
        .attr('stroke-width', 5.5)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .attr('opacity', 0.75)
        .attr('vector-effect', 'non-scaling-stroke')
    }
    for (const { leg, d } of ds) {
      routeLayer
        .append('path')
        .attr('d', d)
        .attr('fill', 'none')
        .style('stroke', 'var(--wf-accent)')
        .attr('stroke-width', 2.6)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-dasharray', leg.mode === 'walk' ? '0.5 5' : null)
        .attr('vector-effect', 'non-scaling-stroke')
    }
  }

  // ── Hover hit targets for named lines (streets / wall / rail) ──
  type HitLayer = 'streets' | 'wall' | 'rail'
  type HitDatum = { feature: Feature<Geometry, LineProps>; label: string; layer: HitLayer }
  const hitData: HitDatum[] = [
    ...roads.features
      .filter((f) => f.properties.n)
      .map((f) => ({ feature: f, label: f.properties.n!, layer: 'streets' as const })),
    ...wall.features
      .filter((f) => f.properties.n)
      .map((f) => ({ feature: f, label: f.properties.n!, layer: 'wall' as const })),
    ...transit.features
      .filter((f) => f.properties.ref)
      .map((f) => ({
        feature: f,
        label: `${f.properties.ref} · ${f.properties.net === 'sbahn' ? 'S-Bahn' : 'U-Bahn'}`,
        layer: 'rail' as const,
      })),
  ]
  const hits = root
    .append('g')
    .attr('data-role', 'line-hits')
    .selectAll<SVGPathElement, HitDatum>('path')
    .data(hitData)
    .join('path')
    .attr('d', (d) => path(d.feature) ?? '')
    .attr('fill', 'none')
    .attr('stroke', 'transparent')
    .attr('stroke-width', 14)
    .attr('vector-effect', 'non-scaling-stroke')
    .attr('data-hit-layer', (d) => d.layer)
    .style('pointer-events', 'stroke')
    .style('cursor', 'help')
    .on('pointerenter', (event: PointerEvent, d) => callbacks.onLineEnter(d.label, event))
    .on('pointermove', (event: PointerEvent, d) => callbacks.onLineMove(d.label, event))
    .on('pointerleave', () => callbacks.onLineLeave())

  // ── Marker overlay (screen-space, repainted on zoom) ──────
  const overlay = svg.append('g').attr('data-role', 'markers')

  // base (unzoomed) projected positions
  const base = new Map<string, [number, number]>()
  for (const p of Object.values(byId)) base.set(p.id, project(p))

  let transform = d3.zoomIdentity
  let selectedId: string | null = null
  let visibleCategories: ReadonlySet<BerlinCategoryKey> = new Set(BERLIN_CATEGORIES.map((c) => c.key))
  let filterFaded: ReadonlySet<string> = new Set()
  let dayIds: readonly string[] = []
  let clusterOn = true

  const screen = (id: string): [number, number] => {
    const m = base.get(id) ?? [-9999, -9999]
    return [transform.applyX(m[0]), transform.applyY(m[1])]
  }

  function appendPin(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    place: BerlinPlace,
    x: number,
    y: number,
    opts: { active?: boolean; n?: number; faded?: boolean },
  ): void {
    const cat = BERLIN_CATEGORY_BY_KEY[place.category]
    const node = g
      .append('g')
      .attr('transform', `translate(${x},${y})`)
      .style('cursor', 'pointer')
      .attr('opacity', opts.faded ? 0.28 : 1)
      .attr('data-place-id', place.id)
    // active / selected ring around the glyph centre
    const glyphCenterY = -(6 + PIN / 2)
    if (opts.active) {
      node
        .append('circle')
        .attr('cx', 0)
        .attr('cy', glyphCenterY)
        .attr('r', PIN / 2 + 6)
        .attr('fill', 'none')
        .style('stroke', 'var(--wf-accent)')
        .attr('stroke-width', 2)
    }
    // stem + anchor dot
    node
      .append('line')
      .attr('x1', 0)
      .attr('y1', -6)
      .attr('x2', 0)
      .attr('y2', 0)
      .style('stroke', 'var(--wf-ink)')
      .attr('stroke-width', 1.4)
    node.append('circle').attr('cx', 0).attr('cy', 0).attr('r', 1.4).style('fill', 'var(--wf-ink)')
    // glyph
    const glyph = node.append('g').attr('transform', `translate(${-PIN / 2},${-(PIN + 6)})`)
    const sn = shapeNode(cat.shape, PIN, 1.4)
    glyph
      .append(sn.tag)
      .attr('fill', cat.color)
      .style('stroke', 'var(--wf-ink)')
      .attr('stroke-width', 1.4)
      .attr('stroke-linejoin', 'round')
      .each(function () {
        const el = d3.select(this)
        for (const [k, v] of Object.entries(sn.attrs)) el.attr(k, v as number | string)
      })
    if (opts.n != null) {
      node
        .append('text')
        .attr('x', 0)
        .attr('y', glyphCenterY + 4)
        .attr('text-anchor', 'middle')
        .attr('font-size', 11)
        .attr('font-weight', 700)
        .attr('fill', '#fff')
        .attr('pointer-events', 'none')
        .text(opts.n)
    }
    // interactions
    let down: { x: number; y: number } | null = null
    node
      .on('pointerenter', (event: PointerEvent) => callbacks.onPinEnter(place, event))
      .on('pointerleave', () => callbacks.onPinLeave())
      .on('pointerdown', (event: PointerEvent) => (down = { x: event.clientX, y: event.clientY }))
      .on('pointerup', (event: PointerEvent) => {
        const start = down
        down = null
        if (!start) return
        const dx = event.clientX - start.x
        const dy = event.clientY - start.y
        if (dx * dx + dy * dy > CLICK_DIST_SQ) return
        callbacks.onPinClick(place, x, y)
      })
  }

  function appendCluster(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    count: number,
    x: number,
    y: number,
    bbox: [number, number, number, number],
    faded: boolean,
  ): void {
    const node = g
      .append('g')
      .attr('transform', `translate(${x},${y})`)
      .style('cursor', 'pointer')
      .attr('opacity', faded ? 0.45 : 1)
    node
      .append('circle')
      .attr('r', 16)
      .style('fill', 'var(--wf-paper-2)')
      .style('stroke', 'var(--wf-ink)')
      .attr('stroke-width', 1.5)
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 4)
      .attr('font-size', 13)
      .attr('font-weight', 700)
      .style('fill', 'var(--wf-ink)')
      .attr('pointer-events', 'none')
      .text(count)
    node.on('click', () => fitBounds(bbox[0], bbox[1], bbox[2], bbox[3], 0.5))
  }

  function isFaded(p: BerlinPlace): boolean {
    if (filterFaded.has(p.id)) return true
    if (dayIds.length && !dayIds.includes(p.id)) return true
    return false
  }

  function paint(): void {
    overlay.selectAll('*').remove()
    const g = overlay.append('g')
    const dayset = new Set(dayIds)
    const dayIndex = new Map(dayIds.map((id, i) => [id, i + 1]))
    const vis = Object.values(byId).filter((p) => visibleCategories.has(p.category))
    const rest = vis.filter((p) => !dayset.has(p.id))
    const onScreen = (x: number, y: number) => x > -40 && x < width + 40 && y > -40 && y < height + 40

    if (clusterOn) {
      const cell = 46
      const buckets: Record<string, { p: BerlinPlace; x: number; y: number }[]> = {}
      for (const p of rest) {
        const [x, y] = screen(p.id)
        if (!onScreen(x, y)) continue
        const key = `${Math.round(x / cell)},${Math.round(y / cell)}`
        ;(buckets[key] ||= []).push({ p, x, y })
      }
      for (const grp of Object.values(buckets)) {
        if (grp.length > 1) {
          const cx = grp.reduce((a, o) => a + o.x, 0) / grp.length
          const cy = grp.reduce((a, o) => a + o.y, 0) / grp.length
          const lngs = grp.map((o) => o.p.lng)
          const lats = grp.map((o) => o.p.lat)
          const faded = grp.every((o) => isFaded(o.p))
          appendCluster(
            g,
            grp.length,
            cx,
            cy,
            [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
            faded,
          )
        } else {
          const { p, x, y } = grp[0]
          appendPin(g, p, x, y, { faded: isFaded(p), active: p.id === selectedId })
        }
      }
    } else {
      for (const p of rest) {
        const [x, y] = screen(p.id)
        if (!onScreen(x, y)) continue
        appendPin(g, p, x, y, { faded: isFaded(p), active: p.id === selectedId })
      }
    }
    // active day pins on top, numbered
    for (const id of dayIds) {
      const p = byId[id]
      if (!p || !visibleCategories.has(p.category)) continue
      const [x, y] = screen(id)
      appendPin(g, p, x, y, { active: true, n: dayIndex.get(id) })
    }
  }

  // ── Zoom ──────────────────────────────────────────────────
  const zoom = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.6, 48])
    .on('zoom', (event) => {
      transform = event.transform
      root.attr('transform', transform.toString())
      applyLabelScale(transform.k)
      paint()
    })
  svg.call(zoom)

  function fitBounds(minLng: number, minLat: number, maxLng: number, maxLat: number, padFrac = 0.12): void {
    const tl = projection([minLng, maxLat]) ?? [0, 0]
    const br = projection([maxLng, minLat]) ?? [width, height]
    const dx = Math.max(1, Math.abs(br[0] - tl[0]))
    const dy = Math.max(1, Math.abs(br[1] - tl[1]))
    const cx = (tl[0] + br[0]) / 2
    const cy = (tl[1] + br[1]) / 2
    const ext = zoom.scaleExtent()
    const k = Math.max(ext[0], Math.min(ext[1], (1 - padFrac) * Math.min(width / dx, height / dy)))
    const t = d3.zoomIdentity.translate(width / 2 - cx * k, height / 2 - cy * k).scale(k)
    svg.transition().duration(650).call(zoom.transform, t)
  }

  // ── Handle ────────────────────────────────────────────────
  function setSelected(id: string | null): void {
    selectedId = id
    paint()
  }
  function setVisibleCategories(keys: ReadonlySet<BerlinCategoryKey>): void {
    visibleCategories = keys
    paint()
  }
  function setFilterFaded(ids: ReadonlySet<string>): void {
    filterFaded = ids
    paint()
  }
  function setDay(orderedIds: readonly string[]): void {
    dayIds = orderedIds
    paint()
  }
  function setCluster(on: boolean): void {
    clusterOn = on
    paint()
  }
  function setLayers(layers: BerlinMapLayers): void {
    roadsLayer.attr('display', layers.streets ? null : 'none')
    districtsLayer.attr('display', layers.boroughs ? null : 'none')
    waterLayer.attr('display', layers.water ? null : 'none')
    railLayer.attr('display', layers.rail ? null : 'none')
    wallLayer.attr('display', layers.wall ? null : 'none')
    airportLine.attr('display', layers.airport ? null : 'none')
    commuteLine.attr('display', layers.commute ? null : 'none')
    daytripLine.attr('display', layers.daytrip ? null : 'none')
    const on: Record<HitLayer, boolean> = { streets: layers.streets, wall: layers.wall, rail: layers.rail }
    hits.attr('display', (d) => (on[d.layer] ? null : 'none'))
  }
  function fitPlaces(ids: readonly string[]): void {
    fitCoords(
      ids
        .map((id) => byId[id])
        .filter(Boolean)
        .map((p) => [p.lng, p.lat]),
    )
  }
  function fitCoords(coords: readonly [number, number][]): void {
    if (!coords.length) return fitBounds(...FIT_BOUNDS.city)
    const lngs = coords.map((c) => c[0])
    const lats = coords.map((c) => c[1])
    const padLng = Math.max(0.004, (Math.max(...lngs) - Math.min(...lngs)) * 0.2)
    const padLat = Math.max(0.003, (Math.max(...lats) - Math.min(...lats)) * 0.2)
    fitBounds(
      Math.min(...lngs) - padLng,
      Math.min(...lats) - padLat,
      Math.max(...lngs) + padLng,
      Math.max(...lats) + padLat,
      0.18,
    )
  }
  function fit(preset: BerlinFitPreset): void {
    fitBounds(...FIT_BOUNDS[preset])
  }
  function zoomBy(factor: number): void {
    svg.transition().duration(250).call(zoom.scaleBy, factor)
  }
  function focusPlace(id: string): void {
    setSelected(id)
    fitPlaces([id])
  }
  function resetView(): void {
    setSelected(null)
    fit('city')
  }
  function destroy(): void {
    svg.on('.zoom', null)
    svg.selectAll('*').remove()
  }

  // initial paint + fit to city
  paint()
  fitBounds(...FIT_BOUNDS.city)

  return {
    setSelected,
    setVisibleCategories,
    setLayers,
    setFilterFaded,
    setDay,
    setRoute,
    setCluster,
    zoomBy,
    fit,
    fitPlaces,
    fitCoords,
    focusPlace,
    resetView,
    destroy,
  }
}
