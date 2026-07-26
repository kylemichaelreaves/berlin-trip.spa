import {
  type JSX,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  onCleanup,
  Show,
  untrack,
} from 'solid-js'
import { useElementSize } from '../composables/useElementSize'
import { byId, type BerlinCategoryKey } from '../data/berlinPlaces'
import { loadBerlinGeo, BERLIN_BUILDINGS_URL, BERLIN_POINT_MODELS } from '../data/berlinGeo'
import type { Buildings3DHandle } from './buildings3d'
import { PinPopover } from './PinPopover'
import { MassingControl } from '../ui/MassingControl'
import {
  createBerlinMap,
  type BerlinMapHandle,
  type BerlinMapLayers,
  type BerlinMapRouteLeg,
} from './createBerlinMap'

type Tip = { x: number; y: number; label: string } | null
type Pop = { id: string; x: number; y: number } | null

export type BerlinTripMapProps = {
  layers: () => BerlinMapLayers
  visibleCategories: () => ReadonlySet<BerlinCategoryKey>
  filterFaded: () => ReadonlySet<string>
  dayIds: () => readonly string[]
  route: () => readonly BerlinMapRouteLeg[] | null
  cluster: () => boolean
  selectedId: () => string | null
  onSelect: (id: string | null) => void
  registerHandle: (h: BerlinMapHandle) => void
}

export default function BerlinTripMap(props: BerlinTripMapProps): JSX.Element {
  let svgEl: SVGSVGElement | undefined
  let overlayEl: SVGSVGElement | undefined
  let canvasEl: HTMLCanvasElement | undefined
  const [dims, attachWrapper] = useElementSize()
  const [tip, setTip] = createSignal<Tip>(null)
  const [pop, setPop] = createSignal<Pop>(null)
  let handle: BerlinMapHandle | null = null
  let massing: Buildings3DHandle | null = null
  // The massing now loads asynchronously (module + 620 kB GLB), so the map may
  // already be zoomed by the time it appears. Remember the latest transform so
  // a freshly-built layer can catch up instead of rendering at identity.
  let currentTransform: [number, number, number] = [1, 0, 0]

  // Lazy-load the ~1.5 MB basemap geometry (kept out of the bundle).
  const [geo] = createResource(loadBerlinGeo)

  // Rebuilding the map means rebuilding the d3 scene AND re-extruding 2,384
  // buildings into WebGL, so it must happen only on a real, settled resize.
  //
  // Two things make that harder than it looks. useElementSize hands back a new
  // object on every ResizeObserver tick even when the integer size is
  // unchanged, and Solid compares by identity — so identical sizes still
  // invalidate. And picking a day genuinely reflows the map (the route panel
  // appears), with the height oscillating across several frames before it
  // settles; each intermediate value was triggering its own rebuild.
  //
  // So: dedupe by value, and wait for quiet. Measured 3-4 rebuilds per day
  // click before this, one after.
  const [size, setSize] = createSignal({ w: 0, h: 0 }, { equals: (a, b) => a.w === b.w && a.h === b.h })
  let sizeTimer: ReturnType<typeof setTimeout> | undefined
  createEffect(() => {
    const { w, h } = dims()
    clearTimeout(sizeTimer)
    sizeTimer = setTimeout(() => setSize({ w, h }), 120)
  })
  onCleanup(() => clearTimeout(sizeTimer))

  // ── 3D massing (opt-in) ───────────────────────────────────
  const [show3D, setShow3D] = createSignal(false)
  const [azimuth, setAzimuth] = createSignal(0)
  const [tiltDeg, setTiltDeg] = createSignal(0)
  const [massingLoading, setMassingLoading] = createSignal(false)

  createEffect(() => {
    const el = svgEl
    const { w, h } = size()
    const data = geo()
    if (!el || !data || w <= 0 || h <= 0) return

    handle?.destroy()
    handle = createBerlinMap(
      el,
      data,
      w,
      h,
      {
        onLineEnter: (label, e) => {
          setPop(null)
          setTip({ x: e.offsetX, y: e.offsetY, label })
        },
        onLineMove: (label, e) => setTip({ x: e.offsetX, y: e.offsetY, label }),
        onLineLeave: () => setTip(null),
        onPinEnter: (place, e) => setTip({ x: e.offsetX, y: e.offsetY, label: place.name }),
        onPinLeave: () => setTip(null),
        onPinClick: (place, x, y) => {
          setTip(null)
          setPop({ id: place.id, x, y })
          props.onSelect(place.id)
        },
        onTransform: (k, x, y) => {
          currentTransform = [k, x, y]
          massing?.setTransform(k, x, y)
        },
      },
      overlayEl,
    )

    untrack(() => {
      handle?.setVisibleCategories(props.visibleCategories())
      handle?.setLayers(props.layers())
      handle?.setFilterFaded(props.filterFaded())
      handle?.setDay(props.dayIds())
      handle?.setRoute(props.route())
      handle?.setCluster(props.cluster())
      handle?.setSelected(props.selectedId())
      // A genuine resize still rebuilds the map, and a fresh one starts flat.
      // Without this the SVG would drop its ground affine while the WebGL
      // massing kept the tilt, and the buildings would slide off the map.
      handle?.setView3D(azimuth(), tiltDeg())
      props.registerHandle(handle!)
    })
  })

  // Read each reactive prop into a local FIRST so the effect always tracks it,
  // then forward to the handle. Writing `handle?.setX(props.x())` would
  // short-circuit the whole call (args included) when `handle` is null on the
  // first run — the effect would never subscribe and never fire again.
  createEffect(() => {
    const v = props.visibleCategories()
    handle?.setVisibleCategories(v)
  })
  createEffect(() => {
    const v = props.layers()
    handle?.setLayers(v)
  })
  createEffect(() => {
    const v = props.filterFaded()
    handle?.setFilterFaded(v)
  })
  createEffect(() => {
    const v = props.dayIds()
    handle?.setDay(v)
  })
  createEffect(() => {
    const v = props.route()
    handle?.setRoute(v)
  })
  createEffect(() => {
    const v = props.cluster()
    handle?.setCluster(v)
  })
  createEffect(() => {
    const v = props.selectedId()
    handle?.setSelected(v)
  })

  // Build the WebGL massing once 3D is switched on. It shares the map's
  // projection, so the two agree on where every building sits.
  createEffect(() => {
    const canvas = canvasEl
    const on = show3D()
    const { w, h } = size()
    const h3 = handle
    if (!canvas || !on || !h3 || w <= 0 || h <= 0) return

    let cancelled = false
    onCleanup(() => {
      cancelled = true
    })

    // Both the three.js module (~130 kB gz) and the 620 kB GLB are opt-in, so
    // neither is fetched until someone actually turns the layer on.
    setMassingLoading(true)
    void import('./buildings3d')
      .then(({ createBuildings3D }) => {
        const css = getComputedStyle(canvas)
        const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
        return createBuildings3D(
          canvas,
          BERLIN_BUILDINGS_URL,
          (lng, lat) => h3.projectPoint(lng, lat),
          w,
          h,
          {
            roof: token('--wf-line', '#e4dfd4'),
            wall: token('--wf-muted', '#a39d90'),
            monument: token('--wf-accent', '#c4623e'),
          },
          BERLIN_POINT_MODELS,
        )
      })
      .then((built) => {
        if (cancelled) {
          built.destroy()
          return
        }
        massing?.destroy()
        massing = built
        untrack(() => {
          massing?.setView(azimuth(), tiltDeg())
          massing?.setVisible(show3D())
          massing?.setTransform(...currentTransform)
        })
      })
      .catch((err) => console.error('[massing] failed to load', err))
      .finally(() => setMassingLoading(false))
  })

  createEffect(() => {
    const a = azimuth()
    const t = tiltDeg()
    massing?.setView(a, t)
    handle?.setView3D(a, t)
  })

  createEffect(() => {
    const on = show3D()
    massing?.setVisible(on)
    // Flatten the map back out when 3D is switched off.
    if (!on) {
      setAzimuth(0)
      setTiltDeg(0)
    }
  })

  createEffect(() => {
    const { w, h } = size()
    if (w > 0 && h > 0) massing?.setSize(w, h)
  })

  onCleanup(() => {
    massing?.destroy()
    massing = null
    handle?.destroy()
    handle = null
  })

  const popPlace = createMemo(() => {
    const p = pop()
    return p ? byId[p.id] : null
  })

  return (
    <div
      ref={(el) => attachWrapper(el)}
      class="relative h-full w-full"
      style={{ background: 'var(--wf-paper)' }}
      data-testid="berlin-trip-map"
    >
      {/* Stack: basemap svg -> WebGL massing -> pin overlay svg. The canvas and
          the overlay are pointer-events:none so wheel and drag still land on
          the basemap svg, which owns the d3 zoom behaviour. */}
      <svg
        ref={(el) => {
          svgEl = el
        }}
        class="absolute inset-0 block h-full w-full"
        data-testid="berlin-trip-map-svg"
      />
      <canvas
        ref={(el) => {
          canvasEl = el
        }}
        class="pointer-events-none absolute inset-0 h-full w-full"
        data-testid="berlin-trip-map-buildings"
      />
      <svg
        ref={(el) => {
          overlayEl = el
        }}
        class="pointer-events-none absolute inset-0 block h-full w-full"
        data-testid="berlin-trip-map-overlay"
      />

      <Show when={geo.loading}>
        <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            class="rounded-md px-3 py-2 text-sm font-semibold"
            style={{
              background: 'var(--wf-glass)',
              border: '1.5px solid var(--wf-line)',
              color: 'var(--wf-muted)',
            }}
          >
            Loading map…
          </div>
        </div>
      </Show>
      <Show when={geo.error}>
        <div class="absolute inset-0 flex items-center justify-center p-6">
          <div
            class="max-w-xs rounded-md px-3 py-2 text-center text-sm"
            style={{
              background: 'var(--wf-glass)',
              border: '1.5px solid var(--wf-line)',
              color: 'var(--wf-ink)',
            }}
          >
            Couldn't load the map data.
          </div>
        </div>
      </Show>

      <div class="absolute left-3.5 top-3.5">
        <MassingControl
          on={show3D()}
          loading={massingLoading()}
          azimuth={azimuth()}
          tilt={tiltDeg()}
          onToggle={() => setShow3D((v) => !v)}
          onAzimuth={setAzimuth}
          onTilt={setTiltDeg}
        />
      </div>

      <Show when={tip()}>
        {(t) => (
          <div
            class="pointer-events-none absolute z-10 max-w-[15rem] rounded-md px-2.5 py-1.5 text-xs font-semibold shadow-md"
            style={{
              left: `${t().x + 14}px`,
              top: `${t().y + 14}px`,
              background: 'var(--wf-glass)',
              border: '1.5px solid var(--wf-line)',
              color: 'var(--wf-ink)',
            }}
          >
            {t().label}
          </div>
        )}
      </Show>

      <Show when={popPlace()} keyed>
        {(place) => (
          <PinPopover
            place={place}
            x={pop()!.x}
            y={pop()!.y}
            containerWidth={dims().w}
            onClose={() => {
              setPop(null)
              props.onSelect(null)
            }}
            onFocus={() => handle?.focusPlace(place.id)}
          />
        )}
      </Show>
    </div>
  )
}
