import { type JSX } from 'solid-js'

/**
 * Data credits.
 *
 * Not decorative — OpenStreetMap is ODbL, which requires attribution, and the
 * map is built on it twice over: the whole basemap (districts, water, roads,
 * transit, the Wall route) and the hero building geometry (Berliner Dom,
 * Brandenburger Tor, Reichstag and five more).
 *
 * Berlin's LoD2 model is Datenlizenz Deutschland Zero 2.0 and needs no
 * attribution at all, but it supplies most of the massing, so it is credited
 * on the same footing.
 */
export function Attribution(): JSX.Element {
  return (
    <div class="wf-mono text-[9px] leading-tight" style={{ color: 'var(--wf-muted)' }}>
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener noreferrer"
        class="no-underline hover:underline"
        style={{ color: 'inherit' }}
      >
        © OpenStreetMap contributors
      </a>
      <span> · </span>
      <a
        href="https://daten.berlin.de/datensaetze/3d-gebaudemodelle-im-level-of-detail-2-lod-2-3c7c49af"
        target="_blank"
        rel="noopener noreferrer"
        class="no-underline hover:underline"
        style={{ color: 'inherit' }}
      >
        Berlin LoD2 (dl-de/zero-2-0)
      </a>
    </div>
  )
}
