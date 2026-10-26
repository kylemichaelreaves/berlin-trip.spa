import { type JSX, Show } from 'solid-js'
import { TRIP } from '../data/berlinItinerary'
import { sB } from './styles'

export function TopBar(props: {
  tour: boolean
  theme: string
  onToggleTour: () => void
  onToggleTheme: () => void
  /** Phones: opens the sidebar drawer. The button only renders when set. */
  onOpenPanel?: () => void
}): JSX.Element {
  return (
    <div
      class="flex flex-shrink-0 items-center gap-2 px-2 sm:gap-3 sm:px-4"
      style={{ height: '46px', 'border-bottom': sB, background: 'var(--wf-paper-2)' }}
    >
      <Show when={props.onOpenPanel}>
        {(open) => (
          <button
            type="button"
            onClick={() => open()()}
            aria-label="Layers, filters and itinerary"
            class="flex size-9 shrink-0 items-center justify-center rounded-md"
            style={{ border: sB, color: 'var(--wf-ink)' }}
            data-testid="berlin-open-panel"
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
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
      </Show>
      <div class="truncate text-sm font-bold" style={{ color: 'var(--wf-ink)' }}>
        {TRIP.title}
      </div>
      <span class="hidden text-[11px] sm:inline" style={{ color: 'var(--wf-muted)' }}>
        {TRIP.dateRange}
      </span>
      <div class="flex-1" />
      <button
        type="button"
        onClick={() => props.onToggleTour()}
        class="flex shrink-0 items-center gap-2 whitespace-nowrap text-[11px] font-semibold"
        style={{ border: sB, 'border-radius': '999px', padding: '4px 10px 4px 8px', color: 'var(--wf-ink)' }}
      >
        <span
          class="flex items-center justify-center"
          style={{
            width: '16px',
            height: '16px',
            'border-radius': '50%',
            border: '1.5px solid var(--wf-ink)',
            'font-size': '9px',
          }}
        >
          {props.tour ? '❚❚' : '▶'}
        </span>
        Tour mode
      </button>
      <button
        type="button"
        onClick={() => props.onToggleTheme()}
        class="flex shrink-0 items-center justify-center text-sm"
        style={{ width: '28px', height: '28px', 'border-radius': '50%', border: sB, color: 'var(--wf-ink)' }}
        title="Toggle light / dark"
      >
        {props.theme === 'dark' ? '☾' : '☀'}
      </button>
    </div>
  )
}
