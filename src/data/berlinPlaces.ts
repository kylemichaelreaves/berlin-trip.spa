/**
 * Static data for the Berlin trip map.
 *
 * Each place has true WGS84 coordinates ([lng, lat] order when projected) and a
 * category. Following the paper-wireframe design, each category is a distinct
 * SHAPE + muted colour so the six groups read apart even in grayscale. Colours
 * are fixed so the SVG markers and the HTML legend/list stay in sync.
 */

export type BerlinCategoryKey = 'base' | 'philosophy' | 'history' | 'stationery' | 'craft' | 'transit'

/** Marker silhouette per category (drawn in `createBerlinMap` / `CatGlyph`). */
export type BerlinShape = 'square' | 'circle' | 'triangle' | 'diamond' | 'hexagon' | 'pentagon'

export type BerlinCategory = {
  key: BerlinCategoryKey
  label: string
  /** Short label used in compact chips/legends. */
  short: string
  /** Marker fill + legend swatch. */
  color: string
  /** Marker silhouette. */
  shape: BerlinShape
  /** Example places, shown in the category key. */
  ex: string
}

export type BerlinPlace = {
  id: string
  name: string
  category: BerlinCategoryKey
  lat: number
  lng: number
}

// Shapes + muted colours mirror the paper-wireframe handoff (berlin-map.jsx).
export const BERLIN_CATEGORIES: readonly BerlinCategory[] = [
  {
    key: 'base',
    label: 'Base & work',
    short: 'Base',
    shape: 'square',
    color: '#34322d',
    ex: 'hotel · office',
  },
  {
    key: 'philosophy',
    label: 'Philosophy & humanities',
    short: 'Philosophy',
    shape: 'circle',
    color: 'oklch(0.60 0.085 250)',
    ex: 'graves · uni · museums · libraries',
  },
  {
    key: 'history',
    label: 'History — WWII & Cold War',
    short: 'History',
    shape: 'triangle',
    color: 'oklch(0.58 0.10 32)',
    ex: 'memorials · the Wall · Stasi',
  },
  {
    key: 'stationery',
    label: 'Stationery & books',
    short: 'Stationery',
    shape: 'diamond',
    color: 'oklch(0.60 0.085 155)',
    ex: 'paper · pens · books',
  },
  {
    key: 'craft',
    label: 'Craft & shops (for mom)',
    short: 'Craft',
    shape: 'hexagon',
    color: 'oklch(0.58 0.085 312)',
    ex: 'yarn · beads',
  },
  {
    key: 'transit',
    label: 'Transit anchors',
    short: 'Transit',
    shape: 'pentagon',
    color: 'oklch(0.62 0.075 70)',
    ex: 'airport · stations',
  },
]

export const BERLIN_CATEGORY_BY_KEY: Record<BerlinCategoryKey, BerlinCategory> = Object.fromEntries(
  BERLIN_CATEGORIES.map((c) => [c.key, c]),
) as Record<BerlinCategoryKey, BerlinCategory>

export const BERLIN_PLACES: readonly BerlinPlace[] = [
  { id: 'hilton', name: 'Hilton Berlin (Gendarmenmarkt)', category: 'base', lat: 52.5122, lng: 13.3929 },
  { id: 'babbel', name: 'Babbel office (Friedrichshain)', category: 'base', lat: 52.5121, lng: 13.4307 },
  {
    id: 'hegel-grave',
    name: "Hegel's grave, Dorotheenstadt Cemetery",
    category: 'philosophy',
    lat: 52.5281,
    lng: 13.3841,
  },
  { id: 'brecht-weigel', name: 'Brecht-Weigel Memorial', category: 'philosophy', lat: 52.5289, lng: 13.3847 },
  { id: 'humboldt-uni', name: 'Humboldt University', category: 'philosophy', lat: 52.5179, lng: 13.3937 },
  {
    id: 'bebelplatz',
    name: 'Bebelplatz (book-burning memorial)',
    category: 'philosophy',
    lat: 52.5165,
    lng: 13.3939,
  },
  { id: 'neue-wache', name: 'Neue Wache', category: 'philosophy', lat: 52.5179, lng: 13.3955 },
  {
    id: 'museum-island',
    name: 'Museum Island / Bode-Museum',
    category: 'philosophy',
    lat: 52.522,
    lng: 13.3944,
  },
  { id: 'humboldt-forum', name: 'Humboldt Forum', category: 'philosophy', lat: 52.5173, lng: 13.4017 },
  { id: 'dhm', name: 'German Historical Museum', category: 'philosophy', lat: 52.5186, lng: 13.3964 },
  {
    id: 'staatsbibliothek',
    name: 'Staatsbibliothek (Potsdamer Str.)',
    category: 'philosophy',
    lat: 52.5076,
    lng: 13.3708,
  },
  {
    id: 'grimm-zentrum',
    name: 'Grimm-Zentrum (HU library)',
    category: 'philosophy',
    lat: 52.5202,
    lng: 13.387,
  },
  { id: 'reichstag', name: 'Reichstag', category: 'history', lat: 52.5186, lng: 13.3762 },
  { id: 'brandenburg-gate', name: 'Brandenburg Gate', category: 'history', lat: 52.5163, lng: 13.3777 },
  {
    id: 'holocaust-memorial',
    name: 'Memorial to the Murdered Jews of Europe',
    category: 'history',
    lat: 52.5139,
    lng: 13.3787,
  },
  { id: 'fuhrerbunker', name: 'Führerbunker site', category: 'history', lat: 52.5125, lng: 13.381 },
  { id: 'topography-terror', name: 'Topography of Terror', category: 'history', lat: 52.5067, lng: 13.3837 },
  { id: 'checkpoint-charlie', name: 'Checkpoint Charlie', category: 'history', lat: 52.5074, lng: 13.3904 },
  { id: 'east-side-gallery', name: 'East Side Gallery', category: 'history', lat: 52.505, lng: 13.4397 },
  { id: 'mauerpark', name: 'Mauerpark (flea market)', category: 'history', lat: 52.5427, lng: 13.4027 },
  { id: 'jewish-museum', name: 'Jewish Museum', category: 'history', lat: 52.5023, lng: 13.3954 },
  {
    id: 'resistance-memorial',
    name: 'German Resistance Memorial Center',
    category: 'history',
    lat: 52.5077,
    lng: 13.3629,
  },
  { id: 'stasi-museum', name: 'Stasi Museum', category: 'history', lat: 52.5145, lng: 13.4873 },
  {
    id: 'hohenschonhausen',
    name: 'Hohenschönhausen Memorial (Stasi Prison)',
    category: 'history',
    lat: 52.5418,
    lng: 13.5002,
  },
  { id: 'sachsenhausen', name: 'Sachsenhausen Memorial', category: 'history', lat: 52.7659, lng: 13.2642 },
  { id: 'wannsee', name: 'House of the Wannsee Conference', category: 'history', lat: 52.4329, lng: 13.1654 },
  { id: 'luiban', name: 'LUIBAN Papeterie', category: 'stationery', lat: 52.5257, lng: 13.4111 },
  { id: 'rsvp', name: 'R.S.V.P. Papier', category: 'stationery', lat: 52.5274, lng: 13.4051 },
  { id: 'wollen', name: 'WOLLEN Berlin (yarn)', category: 'craft', lat: 52.5438, lng: 13.3679 },
  { id: 'takaay', name: 'Takaay Perlen-Atelier (beads)', category: 'craft', lat: 52.4905, lng: 13.4264 },
  { id: 'ber-airport', name: 'BER Airport', category: 'transit', lat: 52.3648, lng: 13.512 },
  { id: 'hauptbahnhof', name: 'Berlin Hauptbahnhof', category: 'transit', lat: 52.5251, lng: 13.3694 },
  { id: 'friedrichstrasse', name: 'Friedrichstraße', category: 'transit', lat: 52.5202, lng: 13.387 },
  { id: 'stadtmitte', name: 'Stadtmitte (U2/U6)', category: 'transit', lat: 52.5108, lng: 13.3897 },
  { id: 'alexanderplatz', name: 'Alexanderplatz', category: 'transit', lat: 52.5219, lng: 13.4132 },
  // Added for the itinerary (well-known landmarks with confident coordinates).
  { id: 'dussmann', name: 'Dussmann das KulturKaufhaus', category: 'stationery', lat: 52.5189, lng: 13.3884 },
  { id: 'gendarmenmarkt', name: 'Gendarmenmarkt', category: 'philosophy', lat: 52.5132, lng: 13.3925 },
  { id: 'neues-museum', name: 'Neues Museum', category: 'philosophy', lat: 52.5201, lng: 13.3976 },
  { id: 'naturkunde', name: 'Museum für Naturkunde', category: 'philosophy', lat: 52.5305, lng: 13.3793 },
  {
    id: 'hamburger-bahnhof',
    name: 'Hamburger Bahnhof (museum)',
    category: 'philosophy',
    lat: 52.5277,
    lng: 13.3717,
  },
  {
    id: 'berlinische-galerie',
    name: 'Berlinische Galerie',
    category: 'philosophy',
    lat: 52.5046,
    lng: 13.4007,
  },
  {
    id: 'soviet-memorial',
    name: 'Soviet War Memorial (Treptow)',
    category: 'history',
    lat: 52.4869,
    lng: 13.4699,
  },
  {
    id: 'hegel-house',
    name: "Hegel's House (Am Kupfergraben 4a)",
    category: 'philosophy',
    lat: 52.5203,
    lng: 13.3958,
  },
  {
    id: 'staatsbibliothek-unter-den-linden',
    name: 'Staatsbibliothek zu Berlin — Handschriftenabteilung (Unter den Linden)',
    category: 'philosophy',
    lat: 52.5168,
    lng: 13.3941,
  },
]

export const byId: Record<string, BerlinPlace> = Object.fromEntries(BERLIN_PLACES.map((p) => [p.id, p]))
