import { type JSX, For } from 'solid-js'
import type { BerlinFitPreset } from '../map/createBerlinMap'
import { sB } from './styles'

export function FitControl(props: {
  preset: BerlinFitPreset | null
  cluster: boolean
  onZoom: (f: number) => void
  onFit: (p: BerlinFitPreset) => void
  onToggleCluster: () => void
}): JSX.Element {
  return (
    <div class="flex flex-col items-end gap-2">
      <div
        class="flex flex-col overflow-hidden"
        style={{ border: sB, 'border-radius': '7px', background: 'var(--wf-paper-2)' }}
      >
        <button
          type="button"
          onClick={() => props.onZoom(1.6)}
          class="px-2.5 py-1 text-base font-bold leading-none"
          style={{ 'border-bottom': sB }}
        >
          ＋
        </button>
        <button
          type="button"
          onClick={() => props.onZoom(0.625)}
          class="px-2.5 py-1 text-base font-bold leading-none"
        >
          －
        </button>
      </div>
      <div
        class="overflow-hidden"
        style={{ border: sB, 'border-radius': '7px', background: 'var(--wf-paper-2)' }}
      >
        <div
          class="wf-mono px-2 pb-0.5 pt-1 text-[9px]"
          style={{ color: 'var(--wf-muted)', 'letter-spacing': '0.5px' }}
        >
          FIT TO
        </div>
        <For each={['city', 'region', 'everything'] as BerlinFitPreset[]}>
          {(f) => (
            <button
              type="button"
              onClick={() => props.onFit(f)}
              class="block w-full px-2.5 py-1 text-left text-[11px] capitalize"
              style={{
                'font-weight': props.preset === f ? 700 : 500,
                background: props.preset === f ? 'var(--wf-ink)' : 'transparent',
                color: props.preset === f ? 'var(--wf-paper)' : 'var(--wf-ink)',
                'border-top': '1px solid var(--wf-line)',
              }}
            >
              {f}
            </button>
          )}
        </For>
      </div>
      <button
        type="button"
        onClick={() => props.onToggleCluster()}
        class="wf-mono px-2 py-1 text-[9px]"
        style={{
          border: sB,
          'border-radius': '7px',
          background: props.cluster ? 'var(--wf-ink)' : 'var(--wf-paper-2)',
          color: props.cluster ? 'var(--wf-paper)' : 'var(--wf-ink)',
        }}
        title="Collapse overlapping pins into count bubbles"
      >
        CLUSTER
      </button>
    </div>
  )
}
