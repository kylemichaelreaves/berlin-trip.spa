import { type JSX, For, Show } from 'solid-js'
import { BERLIN_CATEGORIES, BERLIN_PLACES, type BerlinCategoryKey } from '../data/berlinPlaces'
import type { BerlinMapLayers } from '../map/createBerlinMap'
import { Section } from './Section'
import { Toggle } from './Toggle'
import { Badge } from './Badge'
import { CatGlyph } from './CatGlyph'

const CAT_COUNT: Record<BerlinCategoryKey, number> = BERLIN_CATEGORIES.reduce(
  (m, c) => ((m[c.key] = BERLIN_PLACES.filter((p) => p.category === c.key).length), m),
  {} as Record<BerlinCategoryKey, number>,
)
const BASEMAP_LAYERS: { key: keyof BerlinMapLayers; label: string }[] = [
  { key: 'streets', label: 'Streets' },
  { key: 'boroughs', label: 'Borough boundaries' },
  { key: 'water', label: 'Water' },
  { key: 'rail', label: 'Rail network (U/S-Bahn)' },
  { key: 'wall', label: 'Berlin Wall (former route)' },
]
const TRIP_LINES: { key: keyof BerlinMapLayers; label: string; dash: string; accent?: boolean }[] = [
  { key: 'airport', label: 'Airport rail (BER)', dash: '0' },
  { key: 'commute', label: 'Daily commute', dash: '0', accent: true },
  { key: 'daytrip', label: 'Day-trip rail', dash: '6 4' },
]

function Group(props: { title: string; children: JSX.Element }): JSX.Element {
  return (
    <div class="mb-3">
      <div class="mb-1 text-[11px] font-bold">{props.title}</div>
      {props.children}
    </div>
  )
}

function Row(props: {
  label: string
  on: boolean
  glyph?: JSX.Element
  swatch?: JSX.Element
  badge?: number
  accent?: boolean
  onToggle: () => void
}): JSX.Element {
  return (
    <div class="flex items-center gap-2.5 py-1">
      <Show when={props.glyph}>{props.glyph}</Show>
      <span class="flex-1 text-xs">{props.label}</span>
      <Show when={props.swatch}>{props.swatch}</Show>
      <Show when={props.badge != null}>
        <Badge>{props.badge}</Badge>
      </Show>
      <Toggle on={props.on} accentOn={props.accent} onClick={props.onToggle} />
    </div>
  )
}

function LineSwatch(props: { dash: string; accent?: boolean }): JSX.Element {
  return (
    <svg width="22" height="10" viewBox="0 0 22 10">
      <line
        x1="1"
        y1="5"
        x2="21"
        y2="5"
        stroke={props.accent ? 'var(--wf-accent)' : 'var(--wf-ink)'}
        stroke-width="2.2"
        stroke-dasharray={props.dash}
        stroke-linecap="round"
      />
    </svg>
  )
}

export function LayersPanel(props: {
  layers: BerlinMapLayers
  toggleLayer: (k: keyof BerlinMapLayers) => void
  catOn: ReadonlySet<BerlinCategoryKey>
  toggleCat: (k: BerlinCategoryKey) => void
}): JSX.Element {
  return (
    <Section label="LAYERS">
      <Group title="Basemap">
        <For each={BASEMAP_LAYERS}>
          {(l) => <Row label={l.label} on={props.layers[l.key]} onToggle={() => props.toggleLayer(l.key)} />}
        </For>
      </Group>
      <Group title="Trip lines">
        <For each={TRIP_LINES}>
          {(l) => (
            <Row
              label={l.label}
              on={props.layers[l.key]}
              accent={l.accent}
              swatch={<LineSwatch dash={l.dash} accent={l.accent} />}
              onToggle={() => props.toggleLayer(l.key)}
            />
          )}
        </For>
      </Group>
      <Group title="Place categories">
        <For each={BERLIN_CATEGORIES}>
          {(c) => (
            <Row
              label={c.label}
              on={props.catOn.has(c.key)}
              glyph={<CatGlyph cat={c.key} size={14} />}
              badge={CAT_COUNT[c.key]}
              onToggle={() => props.toggleCat(c.key)}
            />
          )}
        </For>
      </Group>
    </Section>
  )
}
