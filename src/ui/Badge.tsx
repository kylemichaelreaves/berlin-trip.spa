import { type JSX } from 'solid-js'

/** Small outlined count badge. */
export function Badge(props: { children: JSX.Element }): JSX.Element {
  return (
    <span
      style={{
        'font-size': '10px',
        'font-weight': 700,
        border: '1.2px solid var(--wf-muted)',
        color: 'var(--wf-muted)',
        'border-radius': '999px',
        padding: '0 6px',
        'min-width': '16px',
        'text-align': 'center',
        'line-height': '15px',
        display: 'inline-block',
      }}
    >
      {props.children}
    </span>
  )
}
