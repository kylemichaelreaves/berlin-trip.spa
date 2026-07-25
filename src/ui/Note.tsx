import { type JSX } from 'solid-js'

/** A dashed annotation callout (regular sans-serif). */
export function Note(props: {
  children: JSX.Element
  width?: string
  style?: JSX.CSSProperties
}): JSX.Element {
  return (
    <div
      class="wf-hand"
      style={{
        width: props.width ?? '100%',
        background: 'var(--wf-glass)',
        border: '1.5px dashed var(--wf-muted)',
        'border-radius': '7px',
        padding: '7px 10px',
        'font-size': '12.5px',
        'line-height': '1.35',
        color: 'var(--wf-ink)',
        'box-shadow': '0 2px 8px rgba(0,0,0,0.07)',
        ...props.style,
      }}
    >
      {props.children}
    </div>
  )
}
