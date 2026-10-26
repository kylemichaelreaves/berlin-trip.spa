import { type JSX } from 'solid-js'
import { BERLIN_CATEGORY_BY_KEY, type BerlinCategoryKey } from '../data/berlinPlaces'
import { shapeNode } from '../data/berlinShapes'

/** A category silhouette (no pin stem) — used in legends, chips, lists. */
export function CatGlyph(props: { cat: BerlinCategoryKey; size?: number; colorOn?: boolean }): JSX.Element {
  const size = () => props.size ?? 16
  const cat = () => BERLIN_CATEGORY_BY_KEY[props.cat]
  const node = () => shapeNode(cat().shape, size(), 1.4)
  const fill = () => (props.colorOn === false ? 'var(--wf-paper-2)' : cat().color)
  return (
    <svg
      width={size()}
      height={size()}
      viewBox={`0 0 ${size()} ${size()}`}
      style={{ display: 'block', 'flex-shrink': 0 }}
    >
      {(() => {
        const n = node()
        const common = {
          fill: fill(),
          stroke: 'var(--wf-ink)',
          'stroke-width': 1.4,
          'stroke-linejoin': 'round' as const,
        }
        // A plain switch on the discriminant, not <Switch>: TS narrows `n.attrs`
        // here, but it can't narrow across a <Match when={…}> prop boundary.
        let el: JSX.Element
        switch (n.tag) {
          case 'circle':
            el = <circle {...n.attrs} {...common} />
            break
          case 'rect':
            el = <rect {...n.attrs} {...common} />
            break
          default:
            el = <polygon {...n.attrs} {...common} />
        }
        return el
      })()}
    </svg>
  )
}
