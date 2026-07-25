/**
 * Lazy loader for the Berlin basemap geometry.
 *
 * The geo JSON (~1.5 MB) is NOT bundled — it's served as static assets from
 * `public/berlin/` (same origin by default) and fetched only when the map
 * mounts, so it stays out of the main bundle.
 *
 * Point `VITE_BERLIN_GEO_BASE` at a dedicated bucket/CDN to move them later
 * with no code change.
 */
import type { FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson'
import type { BuildingProps } from '../map/buildings3d'

export type DistrictProps = { name: string }
export type LineProps = { c?: string; k?: string; n?: string; ref?: string; net?: string; color?: string }

export type BerlinGeo = {
  districts: FeatureCollection<Geometry, DistrictProps>
  water: FeatureCollection<Geometry, LineProps>
  roads: FeatureCollection<Geometry, LineProps>
  transit: FeatureCollection<Geometry, LineProps>
  wall: FeatureCollection<Geometry, LineProps>
}

const GEO_BASE = (
  (import.meta.env as unknown as Record<string, string | undefined>).VITE_BERLIN_GEO_BASE ??
  `${window.location.origin}/berlin`
).replace(/\/$/, '')

async function get<T>(file: string): Promise<T> {
  const url = `${GEO_BASE}/${file}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status} ${res.statusText}`)
  return (await res.json()) as T
}

async function load(): Promise<BerlinGeo> {
  const [districts, water, roads, transit, wall] = await Promise.all([
    get<BerlinGeo['districts']>('districts.json'),
    get<BerlinGeo['water']>('water.json'),
    get<BerlinGeo['roads']>('roads.json'),
    get<BerlinGeo['transit']>('transit.json'),
    get<BerlinGeo['wall']>('wall.json'),
  ])
  return { districts, water, roads, transit, wall }
}

/** LoD2 building massing — separate from the basemap so it only loads on demand. */
export type BerlinBuildings = FeatureCollection<Polygon | MultiPolygon, BuildingProps>

let buildingsCache: Promise<BerlinBuildings> | null = null

/**
 * Fetches the LoD2 footprints (~1.2 MB). Deliberately NOT part of
 * {@link loadBerlinGeo}: the 3D layer is opt-in, so most sessions never pay
 * for this.
 */
export function loadBerlinBuildings(): Promise<BerlinBuildings> {
  buildingsCache ??= get<BerlinBuildings>('buildings.json').catch((err) => {
    buildingsCache = null
    throw err
  })
  return buildingsCache
}

let cache: Promise<BerlinGeo> | null = null

/** Fetches the basemap geometry once per session (retries if a prior load failed). */
export function loadBerlinGeo(): Promise<BerlinGeo> {
  cache ??= load().catch((err) => {
    cache = null
    throw err
  })
  return cache
}
