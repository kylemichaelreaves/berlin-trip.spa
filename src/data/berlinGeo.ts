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
import type { FeatureCollection, Geometry } from 'geojson'

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

/**
 * URL of the LoD2 building massing (~620 kB GLB). Deliberately NOT part of
 * {@link loadBerlinGeo}: the 3D layer is opt-in, so most sessions never fetch
 * it. GLTFLoader takes the URL directly, so there is nothing to load here.
 */
export const BERLIN_BUILDINGS_URL = `${GEO_BASE}/berlin.glb`

/**
 * Monuments with no building record anywhere, added as individual meshes.
 *
 * The Hegel-Denkmal is a 3.3 m bust on a herm pedestal — no cadastre entry, so
 * LoD2 has nothing, and OSM maps it only as a point. This is a photogrammetry
 * scan decimated from 2,000,416 triangles to 4,002 by `mesh2paper.py`.
 * Credit: VIMUNE, CC-BY-4.0 — see 90_credits.md in the geometry repo.
 */
export const BERLIN_POINT_MODELS = [
  {
    id: 'hegel-denkmal',
    url: `${GEO_BASE}/hegel-denkmal.glb`,
    lng: 13.3936026,
    lat: 52.5193186,
    // Drawn 8x oversize, so about 26 m apparent against its real 3.3 m. At
    // true scale it is 0.8 px at the zoom where you can see a neighbourhood
    // and 4 px at the maximum — the projection is fitted to the whole city,
    // and a bust is not a building. Oversized it reads like the landmark it
    // is, at the right coordinate. Buildings stay metrically honest.
    scale: 8,
  },
] as const

let cache: Promise<BerlinGeo> | null = null

/** Fetches the basemap geometry once per session (retries if a prior load failed). */
export function loadBerlinGeo(): Promise<BerlinGeo> {
  cache ??= load().catch((err) => {
    cache = null
    throw err
  })
  return cache
}
