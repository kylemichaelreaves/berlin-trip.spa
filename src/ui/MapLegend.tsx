import { type JSX, For } from 'solid-js'
import { BERLIN_CATEGORIES, type BerlinCategoryKey } from '../data/berlinPlaces'
import { CatGlyph } from './CatGlyph'
import { sB } from './styles'

export function MapLegend(props: {
  catOn: ReadonlySet<BerlinCategoryKey>
  toggleCat: (k: BerlinCategoryKey) => void
}): JSX.Element {
  return (
    <div
      style={{
        background: 'var(--wf-glass)',
        border: sB,
        'border-radius': '8px',
        padding: '9px 11px',
        'box-shadow': '0 2px 10px rgba(0,0,0,0.08)',
      }}
    >
      <div class="wf-mono mb-1.5 text-[9px] font-bold tracking-widest" style={{ color: 'var(--wf-muted)' }}>
        LEGEND
      </div>
      <div class="grid grid-cols-2" style={{ gap: '5px 14px' }}>
        <For each={BERLIN_CATEGORIES}>
          {(c) => (
            <button
              type="button"
              onClick={() => props.toggleCat(c.key)}
              class="flex items-center gap-1.5"
              style={{ opacity: props.catOn.has(c.key) ? 1 : 0.35 }}
            >
              <CatGlyph cat={c.key} size={13} colorOn={props.catOn.has(c.key)} />
              <span class="text-[10.5px] font-semibold" style={{ color: 'var(--wf-ink)' }}>
                {c.short}
              </span>
            </button>
          )}
        </For>
      </div>
    </div>
  )
}
