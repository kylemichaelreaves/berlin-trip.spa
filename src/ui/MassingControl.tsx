import { type JSX, Show } from 'solid-js'
import { sB } from './styles'

/**
 * Controls for the LoD2 building massing: on/off, plus azimuth and tilt.
 *
 * Tilt 0 is the plain top-down map. Above 0 the ground plane squashes by
 * cos(tilt) and the buildings stand up — the SVG basemap and the WebGL layer
 * are put through the same affine, so they stay registered.
 */
export function MassingControl(props: {
  on: boolean
  loading: boolean
  azimuth: number
  tilt: number
  onToggle: () => void
  onAzimuth: (deg: number) => void
  onTilt: (deg: number) => void
}): JSX.Element {
  return (
    <div
      class="flex flex-col overflow-hidden"
      style={{ border: sB, 'border-radius': '7px', background: 'var(--wf-paper-2)', width: '132px' }}
    >
      <button
        type="button"
        onClick={() => props.onToggle()}
        class="wf-mono flex items-center justify-between px-2 py-1.5 text-[9px]"
        style={{
          background: props.on ? 'var(--wf-ink)' : 'transparent',
          color: props.on ? 'var(--wf-paper)' : 'var(--wf-ink)',
          'letter-spacing': '0.5px',
        }}
        title="Extruded LoD2 building massing"
      >
        <span>3D MASSING</span>
        <span>{props.loading ? '···' : props.on ? '●' : '○'}</span>
      </button>

      <Show when={props.on}>
        <div class="flex flex-col gap-1.5 px-2 py-2" style={{ 'border-top': '1px solid var(--wf-line)' }}>
          <label class="wf-mono flex justify-between text-[9px]" style={{ color: 'var(--wf-muted)' }}>
            <span>TILT</span>
            <span>{Math.round(props.tilt)}°</span>
          </label>
          <input
            type="range"
            min="0"
            max="75"
            step="1"
            value={props.tilt}
            onInput={(e) => props.onTilt(Number(e.currentTarget.value))}
            class="w-full"
            aria-label="Tilt"
          />
          <label class="wf-mono flex justify-between text-[9px]" style={{ color: 'var(--wf-muted)' }}>
            <span>ROTATE</span>
            <span>{Math.round(props.azimuth)}°</span>
          </label>
          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            value={props.azimuth}
            onInput={(e) => props.onAzimuth(Number(e.currentTarget.value))}
            class="w-full"
            aria-label="Rotate"
          />
        </div>
      </Show>
    </div>
  )
}
