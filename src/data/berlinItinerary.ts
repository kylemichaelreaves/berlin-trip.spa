/**
 * Real Berlin work-week itinerary (Sun 12 → Sat 18 Jul 2026).
 *
 * Each day is an ordered list of stops. A stop optionally links to a map place
 * (`placeId` → an id in `berlinPlaces.ts`); linked stops get a numbered pin and
 * drive the day's auto-zoom. Text-only stops (food / spa / boutiques without a
 * mapped location) still appear in the itinerary list — add a place + coords to
 * `berlinPlaces.ts` and set `placeId` to put them on the map.
 *
 * Edit freely: this is hand-transcribed from the planning sheet.
 */

export type ItineraryStop = {
  /** Time or phase, e.g. "2:00–4:30 PM" or "Morning". */
  time?: string
  /** What you're doing. */
  label: string
  /** "Getting there" note. */
  transit?: string
  /** Descriptive aside about the stop itself (opening hours, what to see). */
  notes?: string
  /** Links to a `BERLIN_PLACES` id → numbered pin on the map. */
  placeId?: string
}

export type ItineraryDay = {
  key: string
  short: string
  /** e.g. "12 Jul". */
  date: string
  title: string
  stops: ItineraryStop[]
  /** Unscheduled "fold-in wherever" bucket. */
  flex?: boolean
}

export const TRIP = {
  title: 'Berlin · work week',
  dateRange: 'Sun 12 → Sat 18 Jul',
}

export const DAYS: ItineraryDay[] = [
  {
    key: 'sun',
    short: 'Sun',
    date: '12 Jul',
    title: 'Arrival',
    stops: [
      {
        time: '8:00 AM',
        label: 'Einstein Kaffee (breakfast)',
        notes: 'Opens 8:00 Sunday, right on Gendarmenmarkt',
      },
      {
        label: 'Gendarmenmarkt',
        notes: 'German/French Cathedrals, Konzerthaus',
        placeId: 'gendarmenmarkt',
      },
      {
        label: 'Bebelplatz',
        notes: "Micha Ullman's empty-library memorial, 1933 book-burning site",
        placeId: 'bebelplatz',
      },
      {
        label: 'Humboldt University',
        notes:
          'Main building on Unter den Linden. Hegel held the chair of philosophy here from 1818 until his death, delivered his Berlin lectures (history of philosophy, aesthetics, philosophy of religion, philosophy of right), and served as Rector 1829–30. Courtyard and entrance hall open to visitors.',
        placeId: 'humboldt-uni',
      },
      {
        label: "Hegel's House (Am Kupfergraben 4a)",
        notes:
          'Hegel lived here from 1820 until his death on 14 Nov 1831 (likely cholera) — he had told his wife he wished to die in this house. Private residence today, marked by a plaque; view from the street / Kupfergraben canal.',
        placeId: 'hegel-house',
      },
      {
        label: 'Staatsbibliothek — Handschriftenabteilung (Hegel Nachlass)',
        notes:
          "Holds Hegel's handwritten Nachlass (per Eva Ziesche's catalogue). Manuscript access needs advance arrangement (handschriften-historischedrucke@sbb.spk-berlin.de); the reading rooms and building can be visited more casually.",
        placeId: 'staatsbibliothek-unter-den-linden',
      },
      {
        label: "Hegel's grave (Dorotheenstädtischer Friedhof)",
        notes:
          'Buried 16 Nov 1831 in a plot he chose himself, next to Fichte and Solger (also nearby: Brecht, Heinrich Mann, Marcuse). ~20–25 min walk or short U-Bahn ride north of Unter den Linden.',
        placeId: 'hegel-grave',
      },
      {
        label: 'Neue Wache',
        notes: 'Kollwitz Pietà under the oculus, opens 10:00',
        placeId: 'neue-wache',
      },
      {
        label: 'Neues Museum',
        notes: 'Nefertiti, Egyptian/prehistoric collections. Pergamon next door is closed for renovation.',
        placeId: 'neues-museum',
      },
      {
        time: 'Morning',
        label: 'Land at BER — S9 → Friedrichstr. → U6 → Stadtmitte',
        transit: 'ABC ticket ~€4.70',
        placeId: 'ber-airport',
      },
      { label: 'Check into Hilton (Gendarmenmarkt)', placeId: 'hilton' },
      {
        time: '2:00–4:30 PM',
        label: 'East Side Gallery + Karl-Marx-Allee stroll',
        transit: 'S-Bahn / tram from Mitte',
        placeId: 'east-side-gallery',
      },
    ],
  },
  {
    key: 'mon',
    short: 'Mon',
    date: '13 Jul',
    title: 'Work + Unter den Linden loop',
    stops: [
      { time: '9 AM–6 PM', label: 'Work at Babbel', placeId: 'babbel' },
      {
        time: '6:15 PM',
        label: 'Humboldt University',
        transit: 'U5 → Museumsinsel',
        placeId: 'humboldt-uni',
      },
      { label: 'Neue Wache', placeId: 'neue-wache' },
      { label: "Bebelplatz + St. Hedwig's (Hegel statue en route)", placeId: 'bebelplatz' },
      {
        time: '8:30 PM',
        label: 'Dussmann — buy KSA + Hegel Werke (arrange shipping)',
        transit: 'walk via Friedrichstr.',
        notes: 'Open till midnight Mon–Fri (closed Sundays)',
        placeId: 'dussmann',
      },
      { time: '~9:30 PM', label: 'Staatsbibliothek + stationery stop', placeId: 'staatsbibliothek' },
    ],
  },
  {
    key: 'tue',
    short: 'Tue',
    date: '14 Jul',
    title: 'Work + Naturkunde + Hegel',
    stops: [
      { time: '9 AM–6 PM', label: 'Work at Babbel', placeId: 'babbel' },
      {
        time: 'Lunch',
        label: 'Museum für Naturkunde (optional long lunch)',
        transit: 'U8 → Naturkundemuseum',
        placeId: 'naturkunde',
      },
      {
        time: '6:15 PM',
        label: "Hegel's grave (Dorotheenstadt)",
        transit: 'U8 → Oranienburger Tor',
        placeId: 'hegel-grave',
      },
      { label: 'Brecht-Weigel Memorial (booked)', placeId: 'brecht-weigel' },
      { time: '~8 PM', label: 'Dinner at Clärchens Ballhaus' },
    ],
  },
  {
    key: 'wed',
    short: 'Wed',
    date: '15 Jul',
    title: 'Work + menswear & knick-knacks',
    stops: [
      { time: '9 AM–6 PM', label: 'Work at Babbel', placeId: 'babbel' },
      {
        time: '6:15–9 PM',
        label: 'A.D.Deertz → Pauls Chapter → AMODO → promobo',
        transit: 'U8 → Rosa-Luxemburg-Platz',
      },
      { label: 'Dinner at Markthalle Neun' },
    ],
  },
  {
    key: 'thu',
    short: 'Thu',
    date: '16 Jul',
    title: 'Work + Topography + spa',
    stops: [
      { time: '9 AM–6 PM', label: 'Work at Babbel', placeId: 'babbel' },
      {
        time: '6:15 PM',
        label: 'Topography of Terror',
        transit: 'U2 → Potsdamer Platz',
        placeId: 'topography-terror',
      },
      { label: 'Berlinische Galerie', placeId: 'berlinische-galerie' },
      { time: '~9 PM', label: 'Liquidrom soak' },
    ],
  },
  {
    key: 'fri',
    short: 'Fri',
    date: '17 Jul',
    title: 'Spa + Prenzlauer Berg + dinner',
    stops: [
      {
        time: '9 AM–1 PM',
        label: 'Vabali Spa (booked)',
        transit: 'S-Bahn → Hauptbahnhof',
        placeId: 'hauptbahnhof',
      },
      {
        time: '2–6 PM',
        label: 'Prenzlauer Berg: Dudes Factory → Prater Garten → Yarn over Berlin',
        transit: 'tram M10 → Eberswalder Str.',
      },
      {
        time: '7:30–11 PM',
        label: 'Gendarmenmarkt dinner + optional Tresor',
        transit: 'walk / U6',
        placeId: 'hilton',
      },
    ],
  },
  {
    key: 'sat',
    short: 'Sat',
    date: '18 Jul',
    title: 'Departure',
    stops: [
      {
        time: 'Morning',
        label: 'Check out — U6 → Friedrichstr. → S9 → BER',
        transit: 'ABC ticket',
        placeId: 'hilton',
      },
      { label: 'Depart BER', placeId: 'ber-airport' },
    ],
  },
  {
    key: 'flex',
    short: 'Flex',
    date: '—',
    title: 'Fold into nearby days',
    flex: true,
    stops: [
      { label: 'Soviet War Memorial (Treptow)', placeId: 'soviet-memorial' },
      { label: 'Hamburger Bahnhof', placeId: 'hamburger-bahnhof' },
      { label: 'Pergamon / Altes Museum (Museum Island)', placeId: 'museum-island' },
      { label: 'Tempelhofer Feld' },
      { label: 'Badeschiff' },
    ],
  },
]

export const DAY_BY_KEY: Record<string, ItineraryDay> = Object.fromEntries(DAYS.map((d) => [d.key, d]))

/** Ordered place ids for a day's mapped stops (drives numbering + auto-zoom). */
export function dayPlaceIds(day: ItineraryDay): string[] {
  return day.stops.map((s) => s.placeId).filter((id): id is string => Boolean(id))
}
