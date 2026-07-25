import { type JSX } from 'solid-js'

/** Pill switch (visual only — controlled). */
export function Toggle(props: { on?: boolean; accentOn?: boolean; onClick?: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => props.onClick?.()}
      aria-pressed={props.on}
      style={{
        width: '30px',
        height: '17px',
        'border-radius': '999px',
        border: '1.5px solid var(--wf-ink)',
        background: props.on ? (props.accentOn ? 'var(--wf-accent)' : 'var(--wf-ink)') : 'var(--wf-paper-2)',
        position: 'relative',
        'flex-shrink': 0,
        padding: 0,
        cursor: props.onClick ? 'pointer' : 'default',
        transition: 'background .15s',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '1.5px',
          left: props.on ? '14px' : '1.5px',
          width: '11px',
          height: '11px',
          'border-radius': '50%',
          background: props.on ? '#fff' : 'var(--wf-ink)',
          transition: 'left .15s',
        }}
      />
    </button>
  )
}
