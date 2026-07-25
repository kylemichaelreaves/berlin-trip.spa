import { type JSX, Show, createMemo } from 'solid-js'
import { byId } from '../data/berlinPlaces'
import type { BerlinRoute } from '../data/berlinRouteTypes'
import type { DaySegment } from '../utils/daySegments'
import { sB } from './styles'

function formatDistance(meters: number): string {
  return meters < 950 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`
}

/** Directions card for the active itinerary leg (shown while stepping). */
export function RouteInfo(props: { seg: DaySegment; route: BerlinRoute | null }): JSX.Element {
  const summary = createMemo<string | null>(() => {
    const r = props.route
    if (!r) return null
    const lines = r.legs.filter((l) => l.mode === 'transit' && l.name).map((l) => l.name)
    const head = lines.length ? lines.join(' → ') : 'walk'
    const dist = r.distanceM != null ? ` · ${formatDistance(r.distanceM)}` : ''
    return `${head} · ~${r.durationMin} min${dist}`
  })
  return (
    <div
      class="max-w-md rounded-md px-3 py-1.5 text-center shadow-md"
      style={{ background: 'var(--wf-glass)', border: sB, color: 'var(--wf-ink)' }}
      data-testid="berlin-route-info"
    >
      <div class="text-[11px] font-bold">
        {byId[props.seg.fromId]?.name} → {byId[props.seg.toId]?.name}
      </div>
      <Show when={summary()}>
        <div class="wf-mono text-[10px]" style={{ color: 'var(--wf-muted)' }}>
          {summary()}
        </div>
      </Show>
      <Show when={props.route?.via} keyed>
        {(via) => (
          <div class="text-[10px]" style={{ color: 'var(--wf-muted)' }}>
            via {via.join(' · ')}
          </div>
        )}
      </Show>
      <Show when={props.seg.transitNote}>
        <div class="text-[10px] italic" style={{ color: 'var(--wf-muted)' }}>
          {props.seg.transitNote}
        </div>
      </Show>
    </div>
  )
}
