import { type JSX, For } from 'solid-js'
import { BERLIN_CATEGORIES, type BerlinCategoryKey } from '../data/berlinPlaces'
import { Section } from './Section'
import { Chip } from './Chip'
import { Toggle } from './Toggle'
import { sB } from './styles'

export function FilterPanel(props: {
  query: string
  setQuery: (v: string) => void
  walkable: boolean
  setWalkable: (v: boolean) => void
  catOn: ReadonlySet<BerlinCategoryKey>
  toggleCat: (k: BerlinCategoryKey) => void
}): JSX.Element {
  return (
    <Section label="FILTER">
      <div class="mb-3 flex items-center gap-2 px-2.5 py-2" style={{ border: sB, 'border-radius': '7px' }}>
        <span class="text-[13px]">⌕</span>
        <input
          value={props.query}
          onInput={(e) => props.setQuery(e.currentTarget.value)}
          placeholder="Search places…"
          class="w-full bg-transparent text-xs outline-none"
          style={{ color: 'var(--wf-ink)', 'font-family': 'inherit' }}
        />
      </div>
      <div class="mb-3 flex flex-wrap gap-1.5">
        <For each={BERLIN_CATEGORIES}>
          {(c) => (
            <Chip cat={c.key} on={props.catOn.has(c.key)} onClick={() => props.toggleCat(c.key)}>
              {c.short}
            </Chip>
          )}
        </For>
      </div>
      <div
        class="flex items-center gap-2.5 px-2.5 py-2"
        style={{
          border: props.walkable ? sB : '1.5px dashed var(--wf-muted)',
          'border-radius': '7px',
          background: props.walkable ? 'var(--wf-paper-2)' : 'transparent',
        }}
      >
        <Toggle on={props.walkable} onClick={() => props.setWalkable(!props.walkable)} />
        <div>
          <div class="text-xs font-bold">Walkable from hotel</div>
          <div class="text-[10px]" style={{ color: 'var(--wf-muted)' }}>
            Dims anything needing transit
          </div>
        </div>
      </div>
    </Section>
  )
}
