import { type JSX } from 'solid-js'
import { sB } from './styles'

export function ScaleBar(props: { label: string }): JSX.Element {
  return (
    <div class="wf-mono flex flex-col gap-0.5 text-[9px]" style={{ color: 'var(--wf-muted)' }}>
      <div
        style={{ width: '56px', height: '5px', 'border-left': sB, 'border-right': sB, 'border-bottom': sB }}
      />
      <span>{props.label}</span>
    </div>
  )
}
