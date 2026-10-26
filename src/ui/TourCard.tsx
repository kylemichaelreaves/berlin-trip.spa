import { type JSX, For, Show } from 'solid-js'
import { byId } from '../data/berlinPlaces'
import type { StopRoute } from '../utils/stopRoute'
import { formatRouteSummary, type TourNav, type TourView } from '../utils/tourStep'

const kickerCls = 'wf-mono text-[11px] uppercase tracking-[0.08em]'

function Arrow(props: { direction: 'left' | 'right' }): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d={props.direction === 'right' ? 'M5 12h14M13 6l6 6-6 6' : 'M19 12H5M11 6l-6 6 6 6'} />
    </svg>
  )
}

function NextButton(props: { nav: TourNav; onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => props.onClick()}
      class="flex min-h-[52px] min-w-0 flex-1 items-center justify-between gap-3 rounded-xl px-4 text-left"
      style={{ background: 'var(--wf-ink)', color: 'var(--wf-paper-2)' }}
      data-testid="tour-next"
    >
      <span class="flex min-w-0 flex-col">
        <span class={kickerCls} style={{ opacity: 0.75 }}>
          {props.nav.kicker}
        </span>
        <span class="truncate text-[15px] font-semibold">{props.nav.label}</span>
      </span>
      <Arrow direction="right" />
    </button>
  )
}

function BackButton(props: { nav: TourNav; onClick: () => void; compact: boolean }): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => props.onClick()}
      aria-label={`${props.nav.kicker}: ${props.nav.label}`}
      class="flex min-h-11 shrink-0 items-center justify-center gap-2.5 rounded-xl px-3.5 text-sm md:justify-start"
      classList={{ 'w-[52px] md:w-full': props.compact }}
      style={{ border: '1.5px solid var(--wf-line)', color: 'var(--wf-ink)' }}
      data-testid="tour-back"
    >
      <Arrow direction="left" />
      <span class="hidden truncate md:inline">{props.nav.label}</span>
    </button>
  )
}

/**
 * Tour mode's story card: one stop at a time with its notes, how you got
 * there, and a monument illustration where one exists. A right-hand panel on
 * desktop, a bottom sheet on phones.
 */
export function TourCard(props: {
  view: TourView
  route: StopRoute | null
  autoplay: boolean
  onToggleAutoplay: () => void
  onNext: () => void
  onBack: () => void
}): JSX.Element {
  const progress = () => {
    const v = props.view
    const count = v.kind === 'stop' ? v.count : v.stopCount
    const at = v.kind === 'stop' ? v.index : -1
    return Array.from({ length: count }, (_, i) =>
      i < at ? 'var(--wf-ink)' : i === at ? 'var(--wf-accent)' : 'var(--wf-line)',
    )
  }

  return (
    <article
      class="pointer-events-auto absolute inset-x-0 bottom-0 flex max-h-[62%] flex-col gap-3.5 overflow-y-auto rounded-t-[20px] px-4 pb-5 pt-4 md:inset-x-auto md:bottom-6 md:right-6 md:top-6 md:max-h-none md:w-[460px] md:gap-5 md:rounded-2xl md:p-7"
      style={{
        background: 'var(--wf-paper-2)',
        border: '1px solid var(--wf-line)',
        color: 'var(--wf-ink)',
        'box-shadow': '0 12px 40px rgba(0, 0, 0, 0.18)',
      }}
      aria-live="polite"
      data-testid="tour-card"
    >
      <div class="flex flex-col gap-2.5">
        <div class="flex items-center justify-between gap-3">
          <span class={kickerCls} style={{ color: 'var(--wf-accent-ink)' }} data-testid="tour-position">
            {props.view.kind === 'stop'
              ? `Stop ${props.view.index + 1} of ${props.view.count}`
              : props.view.dayLabel}
          </span>
          <div class="flex items-center gap-2">
            <Show when={props.view.kind === 'stop' && props.view.category}>
              {(c) => (
                <span class={kickerCls} style={{ color: 'var(--wf-ink-2)' }}>
                  {c().short}
                </span>
              )}
            </Show>
            <button
              type="button"
              onClick={() => props.onToggleAutoplay()}
              aria-label={props.autoplay ? 'Pause autoplay' : 'Play through stops'}
              aria-pressed={props.autoplay}
              class="flex size-9 items-center justify-center rounded-full"
              style={{ border: '1.5px solid var(--wf-line)', color: 'var(--wf-ink)' }}
              data-testid="tour-autoplay"
            >
              <Show
                when={props.autoplay}
                fallback={
                  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 4v16l13-8z" />
                  </svg>
                }
              >
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                </svg>
              </Show>
            </button>
          </div>
        </div>
        <div aria-hidden="true" class="flex gap-[3px]">
          <For each={progress()}>
            {(color) => <span class="h-1 flex-1 rounded-sm" style={{ background: color }} />}
          </For>
        </div>
      </div>

      <Show
        when={props.view.kind === 'stop' ? props.view : null}
        fallback={
          <Show when={props.view.kind === 'intro' ? props.view : null}>
            {(v) => (
              <div class="flex flex-col gap-2">
                <span class={kickerCls} style={{ color: 'var(--wf-ink-2)' }}>
                  {v().day.short} {v().day.date} · {v().stopCount} stops
                </span>
                <h2 class="wf-serif m-0 text-[40px] leading-none md:text-[52px]" data-testid="tour-title">
                  {v().day.title}
                </h2>
              </div>
            )}
          </Show>
        }
      >
        {(v) => (
          <>
            <div class="flex items-end gap-4 md:gap-5">
              <Show when={v().illustration}>
                {(art) => (
                  <img
                    src={art().url}
                    alt={`Illustration: ${art().caption}`}
                    title={art().caption}
                    class="h-24 w-14 shrink-0 object-contain md:h-[180px] md:w-[104px]"
                  />
                )}
              </Show>
              <div class="flex min-w-0 flex-col gap-1">
                <Show when={v().stop.time}>
                  <span class={kickerCls} style={{ color: 'var(--wf-ink-2)' }}>
                    {v().stop.time}
                  </span>
                </Show>
                <h2 class="wf-serif m-0 text-[32px] leading-[1.02] md:text-[44px]" data-testid="tour-title">
                  {v().stop.label}
                </h2>
              </div>
            </div>
            <Show when={v().place && v().place!.name !== v().stop.label ? v().place : null}>
              {(p) => (
                <p class="wf-mono m-0 text-[13px]" style={{ color: 'var(--wf-ink-2)' }}>
                  {p().name}
                </p>
              )}
            </Show>
            <Show when={v().stop.notes}>
              <p class="m-0 text-[15px] leading-relaxed md:text-[17px]">{v().stop.notes}</p>
            </Show>
            <Show when={props.route || v().stop.transit}>
              <div
                class="flex flex-col gap-1 rounded-lg px-3 py-2.5"
                style={{ background: 'var(--wf-paper)' }}
              >
                <span class={kickerCls} style={{ color: 'var(--wf-ink-2)' }}>
                  Getting there
                </span>
                <Show when={props.route} keyed>
                  {(r) => (
                    <span class="text-sm">
                      {r.seg.mode === 'walk' ? 'Walk' : 'Transit'} from {byId[r.seg.fromId]?.name}
                      {r.route ? ` · ${formatRouteSummary(r.route)}` : ''}
                    </span>
                  )}
                </Show>
                <Show when={v().stop.transit}>
                  <span class="text-sm italic" style={{ color: 'var(--wf-ink-2)' }}>
                    {v().stop.transit}
                  </span>
                </Show>
              </div>
            </Show>
          </>
        )}
      </Show>

      <div class="mt-auto flex gap-2 md:flex-col-reverse">
        <Show when={props.view.kind === 'stop' ? props.view : null}>
          {(v) => <BackButton nav={v().prev} onClick={props.onBack} compact />}
        </Show>
        <NextButton nav={props.view.next} onClick={props.onNext} />
      </div>
    </article>
  )
}
