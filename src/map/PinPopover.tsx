import { type JSX, Show } from 'solid-js'
import { BERLIN_CATEGORY_BY_KEY, type BerlinPlace } from '../data/berlinPlaces'
import { walkMinutesFromHotel } from '../utils/walkFromHotel'
import { placeDays } from '../utils/placeDays'
import { CatGlyph } from '../ui/CatGlyph'

/** Pin detail card, anchored near the clicked marker (screen px within the map). */
export function PinPopover(props: {
  place: BerlinPlace
  x: number
  y: number
  containerWidth: number
  onClose: () => void
  onFocus: () => void
}): JSX.Element {
  const cat = () => BERLIN_CATEGORY_BY_KEY[props.place.category]
  const walk = () => walkMinutesFromHotel(props.place)
  const days = () => placeDays(props.place.id)
  return (
    <div
      class="absolute z-20 w-60 overflow-hidden rounded-lg shadow-xl"
      style={{
        left: `${Math.min(props.x + 16, props.containerWidth - 250)}px`,
        top: `${Math.max(8, props.y - 150)}px`,
        background: 'var(--wf-paper-2)',
        border: '1.5px solid var(--wf-ink)',
      }}
    >
      <div
        class="flex items-start gap-2 px-3 pb-2.5 pt-3"
        style={{ 'border-bottom': '1px solid var(--wf-line)' }}
      >
        <CatGlyph cat={props.place.category} size={17} />
        <div class="flex-1">
          <div class="text-sm font-bold leading-tight">{props.place.name}</div>
          <div class="mt-0.5 text-[10.5px]" style={{ color: 'var(--wf-muted)' }}>
            {cat().label}
          </div>
        </div>
        <button
          type="button"
          class="text-base leading-none"
          style={{ color: 'var(--wf-muted)' }}
          onClick={() => props.onClose()}
        >
          ×
        </button>
      </div>
      <div class="flex flex-col gap-1.5 px-3 py-2.5 text-[11.5px]">
        <div class="flex gap-2">
          <span class="w-[68px] shrink-0" style={{ color: 'var(--wf-muted)' }}>
            From hotel
          </span>
          <span class="font-semibold">
            {walk() == null ? 'transit needed' : walk() === 0 ? 'you are here' : `${walk()} min walk`}
          </span>
        </div>
        <Show when={days().length}>
          <div class="flex gap-2">
            <span class="w-[68px] shrink-0" style={{ color: 'var(--wf-muted)' }}>
              On
            </span>
            <span class="font-semibold">{days().join(', ')}</span>
          </div>
        </Show>
      </div>
      <div class="flex gap-2 px-3 pb-3">
        <button
          type="button"
          class="flex-1 rounded-full py-1.5 text-[11px] font-bold"
          style={{ background: 'var(--wf-ink)', color: 'var(--wf-paper)' }}
          onClick={() => props.onFocus()}
        >
          Focus on map
        </button>
      </div>
    </div>
  )
}
