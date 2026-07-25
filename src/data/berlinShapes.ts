/**
 * Category marker silhouettes, shared by the D3 map and the SolidJS UI so a
 * "square" looks identical on the map, in the legend, and in the itinerary.
 */
import type { BerlinShape } from './berlinPlaces'

export type ShapeNode =
  | { tag: 'circle'; attrs: { cx: number; cy: number; r: number } }
  | { tag: 'rect'; attrs: { x: number; y: number; width: number; height: number; rx: number } }
  | { tag: 'polygon'; attrs: { points: string } }

/** Geometry for a `shape` drawn inside a `size`×`size` box with stroke width `sw`. */
export function shapeNode(shape: BerlinShape, size: number, sw = 1.4): ShapeNode {
  const c = size / 2
  if (shape === 'circle') return { tag: 'circle', attrs: { cx: c, cy: c, r: c - sw } }
  if (shape === 'square')
    return { tag: 'rect', attrs: { x: sw, y: sw, width: size - 2 * sw, height: size - 2 * sw, rx: 1.5 } }
  const poly = (pts: [number, number][]): ShapeNode => ({
    tag: 'polygon',
    attrs: { points: pts.map((p) => p.join(',')).join(' ') },
  })
  if (shape === 'triangle')
    return poly([
      [c, sw],
      [size - sw, size - sw],
      [sw, size - sw],
    ])
  if (shape === 'diamond')
    return poly([
      [c, sw],
      [size - sw, c],
      [c, size - sw],
      [sw, c],
    ])
  const n = shape === 'pentagon' ? 5 : 6
  const r = c - sw
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    pts.push([c + r * Math.cos(a), c + r * Math.sin(a)])
  }
  return poly(pts)
}
