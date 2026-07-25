import { type JSX } from 'solid-js'
import { TRIP } from '../data/berlinItinerary'
import { sB } from './styles'

export function TopBar(props: {
  tour: boolean
  theme: string
  onToggleTour: () => void
  onToggleTheme: () => void
}): JSX.Element {
  return (
    <div
      class="flex flex-shrink-0 items-center gap-3 px-4"
      style={{ height: '46px', 'border-bottom': sB, background: 'var(--wf-paper-2)' }}
    >
      <div class="text-sm font-bold" style={{ color: 'var(--wf-ink)' }}>
        {TRIP.title}
      </div>
      <span class="text-[11px]" style={{ color: 'var(--wf-muted)' }}>
        {TRIP.dateRange}
      </span>
      <div class="flex-1" />
      <button
        type="button"
        onClick={() => props.onToggleTour()}
        class="flex items-center gap-2 text-[11px] font-semibold"
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
        class="flex items-center justify-center text-sm"
        style={{ width: '28px', height: '28px', 'border-radius': '50%', border: sB, color: 'var(--wf-ink)' }}
        title="Toggle light / dark"
      >
        {props.theme === 'dark' ? '☾' : '☀'}
      </button>
    </div>
  )
}
