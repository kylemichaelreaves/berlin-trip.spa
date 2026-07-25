import { type JSX, For, Show } from 'solid-js'
import { byId } from '../data/berlinPlaces'
import type { ItineraryDay } from '../data/berlinItinerary'
import { Section } from './Section'
import { CatGlyph } from './CatGlyph'
import { Note } from './Note'

export function ItineraryPanel(props: {
  day: ItineraryDay | null
  /** Active stop cursor (-1 = whole-day overview). */
  activeStopIndex: number
  onPickStop: (index: number) => void
}): JSX.Element {
  return (
    <Show
      when={props.day}
      fallback={
        <div class="p-4">
          <Note>
            Pick a day in the stepper below (or hit ▶ Tour) to walk the trip — ◀ / ▶ step through each day's
            points before rolling to the next day.
          </Note>
        </div>
      }
    >
      {(d) => (
        <Section label={`DAY · ${d().short.toUpperCase()} ${d().date}`}>
          <div class="mb-2.5 text-[13px] font-bold">{d().title}</div>
          <div class="relative">
            <div
              class="absolute"
              style={{
                left: '10px',
                top: '6px',
                bottom: '6px',
                width: '1.5px',
                background: 'var(--wf-line)',
              }}
            />
            <For each={d().stops}>
              {(s, i) => {
                const place = () => (s.placeId ? byId[s.placeId] : null)
                const active = () => i() === props.activeStopIndex
                return (
                  <button
                    type="button"
                    onClick={() => props.onPickStop(i())}
                    class="relative flex w-full gap-2.5 rounded-md py-1.5 pr-1 text-left"
                    style={{ background: active() ? 'var(--wf-paper-2)' : 'transparent', cursor: 'pointer' }}
                  >
                    <div class="z-[1] flex w-[21px] flex-shrink-0 justify-center">
                      <div
                        class="flex items-center justify-center text-[11px] font-bold"
                        style={{
                          width: '21px',
                          height: '21px',
                          'border-radius': '50%',
                          border: '2px solid var(--wf-accent)',
                          background: active() ? 'var(--wf-accent)' : 'var(--wf-paper-2)',
                          color: active() ? '#fff' : 'var(--wf-ink)',
                          'line-height': '1',
                        }}
                      >
                        {i() + 1}
                      </div>
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-start gap-1.5">
                        <Show when={place()}>
                          <span class="mt-0.5">
                            <CatGlyph cat={place()!.category} size={12} />
                          </span>
                        </Show>
                        <span class="flex-1 text-[12.5px] font-bold leading-tight">{s.label}</span>
                        <Show when={s.time}>
                          <span
                            class="wf-mono mt-px flex-shrink-0 text-[11px] font-bold"
                            style={{ color: 'var(--wf-muted)' }}
                          >
                            {s.time}
                          </span>
                        </Show>
                      </div>
                      <Show when={s.transit}>
                        <div class="mt-0.5 text-[11px] leading-tight" style={{ color: 'var(--wf-muted)' }}>
                          {s.transit}
                        </div>
                      </Show>
                      <Show when={s.notes}>
                        <div
                          class="mt-0.5 text-[11px] italic leading-tight"
                          style={{ color: 'var(--wf-muted)' }}
                        >
                          {s.notes}
                        </div>
                      </Show>
                    </div>
                  </button>
                )
              }}
            </For>
          </div>
        </Section>
      )}
    </Show>
  )
}
