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
        return n.tag === 'circle' ? (
          <circle {...n.attrs} {...common} />
        ) : n.tag === 'rect' ? (
          <rect {...n.attrs} {...common} />
        ) : (
          <polygon points={n.attrs.points} {...common} />
        )
      })()}
    </svg>
  )
}
