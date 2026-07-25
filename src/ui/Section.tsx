import { type JSX } from 'solid-js'

/** A labelled sidebar section with a mono caption. */
export function Section(props: { label: string; children: JSX.Element }): JSX.Element {
  return (
    <div style={{ 'border-bottom': '1px solid var(--wf-line)', padding: '13px 15px' }}>
      <div class="wf-mono mb-2 text-[10px] font-bold tracking-widest" style={{ color: 'var(--wf-muted)' }}>
        {props.label}
      </div>
      {props.children}
    </div>
  )
}
