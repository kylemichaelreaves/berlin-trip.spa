import { type JSX, Show } from 'solid-js'
import { type BerlinCategoryKey } from '../data/berlinPlaces'
import { CatGlyph } from './CatGlyph'

/** Toggleable category chip with a glyph. */
export function Chip(props: {
  cat?: BerlinCategoryKey
  on?: boolean
  onClick?: () => void
  children: JSX.Element
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => props.onClick?.()}
      style={{
        display: 'inline-flex',
        'align-items': 'center',
        gap: '5px',
        border: props.on ? '1.5px solid var(--wf-ink)' : '1.5px dashed var(--wf-muted)',
        'border-radius': '999px',
        padding: '3px 9px 3px 6px',
        background: props.on ? 'var(--wf-paper-2)' : 'transparent',
        'font-size': '11px',
        'font-weight': 600,
        color: props.on ? 'var(--wf-ink)' : 'var(--wf-muted)',
        'white-space': 'nowrap',
        cursor: 'pointer',
        'font-family': 'inherit',
      }}
    >
      <Show when={props.cat}>{(c) => <CatGlyph cat={c()} size={12} />}</Show>
      {props.children}
    </button>
  )
}
