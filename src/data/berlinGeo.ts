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

const env = import.meta.env as unknown as Record<string, string | undefined>

// BASE_URL is Vite's `base` ("/" locally, "/berlin-trip/" in the demos build),
// so the default follows the app wherever it is mounted.
const GEO_BASE = (
  env.VITE_BERLIN_GEO_BASE ?? `${window.location.origin}${env.BASE_URL ?? '/'}berlin`
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

/** A hover sprite: pre-rendered axonometric art, drawn `width` px across. */
export type PlaceSprite = { url: string; width: number }

/**
 * Flat axonometric sprites, keyed by place id.
 *
 * The default view has no WebGL layer loaded at all, so a monument that only
 * exists as a mesh cannot appear there. These are pre-rendered by
 * `mesh2paper.py --svg` and shown on hover — which also sidesteps the scale
 * problem entirely: a sprite is drawn at whatever size reads, whatever the
 * zoom. 15–33 kB gzipped; they look big on disk because every face is its own
 * <polygon>, and that compresses away.
 *
 * `width` is per sprite because these subjects are three orders of magnitude
 * apart in real life — a 48 cm bust and an 82 m cathedral. Nothing here is to
 * scale against the map, but they should stay in some proportion to EACH
 * OTHER, or the Dom reads as a model of itself sitting on a table.
 *
 * Nofretete is drawn in left profile at eye level rather than in the map's
 * 45°/35° axonometric. Looking down at a portrait bust puts the camera on top
 * of her crown, and the result reads as a leaning lump rather than as her.
 *
 * Nofretete is sprite-only, with no entry in {@link BERLIN_POINT_MODELS}. The
 * bust is 48 cm: under a tenth of the Hegel-Denkmal, and under a pixel even at
 * maximum zoom, so no amount of exaggeration makes a mesh of her worth
 * loading. Her scan is the SMB's structured-light capture; the bust itself is
 * public domain under §68 UrhG. See 90_credits.md in the geometry repo.
 *
 * The Berliner Dom is the opposite case, and needs no scan and no point model:
 * it is a building, it is already in `berlin.glb` at true scale as one of the
 * OSM hero landmarks, and this sprite is that same geometry — 40 Simple 3D
 * Buildings parts, baked by `lod2.py glb` and drawn by `mesh2paper.py`. So the
 * hover art and the massing layer are literally the same 3D model, which is
 * why the sprite is suppressed when the massing is switched on.
 *
 * It tops out at 82 m rather than the Dom's 98. OSM puts `height=98` on the
 * cathedral outline but models the parts only to the top of the lantern; the
 * cross above it is nobody's `building:part`. Per Simple 3D Buildings the
 * outline is ignored once parts exist, so 82 m is the honest reading.
 */
export const PLACE_SPRITES: Record<string, PlaceSprite> = {
  'hegel-denkmal': { url: `${GEO_BASE}/hegel-denkmal.svg`, width: 96 },
  nofretete: { url: `${GEO_BASE}/nofretete.svg`, width: 96 },
  'berliner-dom': { url: `${GEO_BASE}/berliner-dom.svg`, width: 150 },
}

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
