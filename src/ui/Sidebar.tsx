import { type JSX, For, Show } from 'solid-js'
import { type BerlinCategoryKey } from '../data/berlinPlaces'
import type { ItineraryDay } from '../data/berlinItinerary'
import type { BerlinMapLayers } from '../map/createBerlinMap'
import { FilterPanel } from './FilterPanel'
import { LayersPanel } from './LayersPanel'
import { ItineraryPanel } from './ItineraryPanel'
import { sB } from './styles'

export function Sidebar(props: {
  tab: 'layers' | 'itinerary'
  setTab: (t: 'layers' | 'itinerary') => void
  query: string
  setQuery: (v: string) => void
  walkable: boolean
  setWalkable: (v: boolean) => void
  catOn: ReadonlySet<BerlinCategoryKey>
  toggleCat: (k: BerlinCategoryKey) => void
  layers: BerlinMapLayers
  toggleLayer: (k: keyof BerlinMapLayers) => void
  activeDay: ItineraryDay | null
  activeStopIndex: number
  onPickStop: (index: number) => void
  /** Set when the sidebar is shown as a phone drawer: adds a close button. */
  onClose?: () => void
  /** Width / extra classes; defaults to the desktop rail. */
  class?: string
}): JSX.Element {
  return (
    <div
      class={`flex shrink-0 flex-col overflow-hidden ${props.class ?? 'w-80'}`}
      style={{ 'border-right': sB, background: 'var(--wf-paper)' }}
      data-testid="berlin-sidebar"
    >
      <div class="flex shrink-0" style={{ 'border-bottom': sB }}>
        <For
          each={
            [
              ['layers', 'Layers & filters'],
              ['itinerary', 'Itinerary'],
            ] as const
          }
        >
          {([k, lbl]) => (
            <button
              type="button"
              onClick={() => props.setTab(k)}
              class="min-h-11 flex-1 py-2.5 text-center text-xs font-bold"
              style={{
                color: props.tab === k ? 'var(--wf-ink)' : 'var(--wf-muted)',
                'border-bottom': props.tab === k ? '2.5px solid var(--wf-accent)' : '2.5px solid transparent',
                background: props.tab === k ? 'var(--wf-paper-2)' : 'transparent',
              }}
            >
              {lbl}
            </button>
          )}
        </For>
        <Show when={props.onClose}>
          {(close) => (
            <button
              type="button"
              onClick={() => close()()}
              aria-label="Close panel"
              class="flex w-11 shrink-0 items-center justify-center"
              style={{ 'border-left': sB, color: 'var(--wf-ink)' }}
              data-testid="berlin-sidebar-close"
            >
              <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </Show>
      </div>

      <div class="flex-1 overflow-y-auto">
        <Show
          when={props.tab === 'layers'}
          fallback={
            <ItineraryPanel
              day={props.activeDay}
              activeStopIndex={props.activeStopIndex}
              onPickStop={props.onPickStop}
            />
          }
        >
          <FilterPanel
            query={props.query}
            setQuery={props.setQuery}
            walkable={props.walkable}
            setWalkable={props.setWalkable}
            catOn={props.catOn}
            toggleCat={props.toggleCat}
          />
          <LayersPanel
            layers={props.layers}
            toggleLayer={props.toggleLayer}
            catOn={props.catOn}
            toggleCat={props.toggleCat}
          />
        </Show>
      </div>
    </div>
  )
}
