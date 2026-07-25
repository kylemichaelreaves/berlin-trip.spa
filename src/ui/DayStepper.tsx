import { type JSX, For } from 'solid-js'
import { DAYS } from '../data/berlinItinerary'
import { sB } from './styles'

function StepBtn(props: { children: JSX.Element; onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => props.onClick()}
      class="flex items-center justify-center text-[9px]"
      style={{ width: '17px', height: '17px', border: sB, 'border-radius': '4px', color: 'var(--wf-ink)' }}
    >
      {props.children}
    </button>
  )
}

export function DayStepper(props: {
  activeKey: string | null
  tour: boolean
  onPick: (k: string) => void
  onStep: (dir: 1 | -1) => void
  onToggleTour: () => void
}): JSX.Element {
  return (
    <div class="flex-shrink-0 px-4 pb-3 pt-2.5" style={{ 'border-top': sB, background: 'var(--wf-paper-2)' }}>
      <div class="flex items-center gap-3">
        <div class="flex flex-shrink-0 items-center gap-1.5">
          <StepBtn onClick={() => props.onStep(-1)}>◀</StepBtn>
          <button
            type="button"
            onClick={() => props.onToggleTour()}
            class="flex items-center justify-center text-[11px]"
            style={{
              width: '28px',
              height: '28px',
              'border-radius': '50%',
              border: sB,
              background: props.tour ? 'var(--wf-accent)' : 'var(--wf-paper)',
              color: props.tour ? '#fff' : 'var(--wf-ink)',
            }}
          >
            {props.tour ? '❚❚' : '▶'}
          </button>
          <StepBtn onClick={() => props.onStep(1)}>▶</StepBtn>
        </div>
        <div style={{ width: '1px', height: '26px', background: 'var(--wf-line)' }} class="flex-shrink-0" />
        <div class="relative flex flex-1 items-stretch">
          <div
            class="absolute"
            style={{
              left: '18px',
              right: '18px',
              top: '13px',
              height: '1.5px',
              background: 'var(--wf-line)',
            }}
          />
          <For each={DAYS}>
            {(d) => {
              const on = () => d.key === props.activeKey
              return (
                <button
                  type="button"
                  onClick={() => props.onPick(d.key)}
                  class="relative z-[1] flex flex-1 flex-col items-center gap-1"
                >
                  <div
                    style={{
                      width: on() ? '16px' : '9px',
                      height: on() ? '16px' : '9px',
                      'border-radius': '50%',
                      border: sB,
                      background: on() ? 'var(--wf-accent)' : 'var(--wf-paper-2)',
                      transition: 'all .2s',
                    }}
                  />
                  <div
                    class="text-[11px]"
                    style={{
                      'font-weight': on() ? 700 : 500,
                      color: on() ? 'var(--wf-ink)' : 'var(--wf-muted)',
                    }}
                  >
                    {d.short}
                  </div>
                  <div class="wf-mono text-[9px]" style={{ color: 'var(--wf-muted)' }}>
                    {d.date.split(' ')[0]}
                  </div>
                </button>
              )
            }}
          </For>
        </div>
      </div>
    </div>
  )
}
