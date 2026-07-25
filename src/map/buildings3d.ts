/**
 * WebGL building massing, drawn under the SVG basemap.
 *
 * Geometry comes from Berlin's official LoD2 model, exported to GeoJSON by
 * `lod2.py geojson` in the berlin-architecture-geometry repo: a footprint
 * MultiPolygon per building plus a surveyed `height`.
 *
 * ── How this stays glued to the 2D map ──────────────────────────────────
 * The camera is ORTHOGRAPHIC, which is what makes the whole thing tractable.
 * Under an orthographic camera the ground plane (h = 0) maps to the screen by
 * a plain 2D affine — rotate by the azimuth, then squash vertically by
 * cos(tilt). No perspective divide, no vanishing point. So the SVG can be put
 * through the *same* affine via its root transform and the two stay registered
 * to the pixel at any zoom, pan, tilt or spin.
 *
 * The shared mapping, for a ground point (x, y) in projection pixels and a
 * height h (also in projection pixels):
 *
 *   X = x·cosφ − y·sinφ
 *   Y = (x·sinφ + y·cosφ)·cosθ − h·sinθ
 *   Z = (x·sinφ + y·cosφ)·sinθ + h·cosθ        (depth, for the z-buffer)
 *
 * with φ = azimuth, θ = tilt. At θ = 0 this collapses to a plain rotation and
 * Y is untouched — a top-down map, with Z ordering by height so taller
 * buildings sit above shorter ones. `groundAffine()` in createBerlinMap.ts
 * returns the h = 0 case of exactly this, which is what keeps the SVG in step.
 */
import * as THREE from 'three'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'

export type BuildingProps = {
  landmark: string
  height: number
  geom_height: number
  base_m: number
  footprint_m2: number
  roof: string
  /**
   * Present only on features sourced from OSM Simple 3D Buildings — the hero
   * landmarks where LoD2 gives a flat box (Berliner Dom, Reichstag) or nothing
   * at all (Brandenburger Tor). LoD2 carries its shape in the geometry; OSM
   * describes a solid parametrically, so the client has to rebuild it.
   */
  src?: 'osm'
  /** Metres above ground the part starts — stacked parts float on lower ones. */
  min_h_m?: number
  /** How much of `height` is roof rather than wall. */
  roof_h_m?: number
  roof_shape?: string
}

/** Roof shapes we loft into a solid. Anything else is capped flat. */
const ROOF_SOLIDS = new Set(['dome', 'onion', 'pyramidal', 'hipped', 'cone', 'conical'])

export type Buildings3DPalette = {
  roof: string
  wall: string
  /** Monument objects — the Holocaust Memorial stelae come through as ~2.4 m² blocks. */
  monument: string
}

export type Buildings3DHandle = {
  /** Mirror the d3 zoom transform. */
  setTransform: (k: number, x: number, y: number) => void
  setView: (azimuthDeg: number, tiltDeg: number) => void
  setSize: (width: number, height: number) => void
  setVisible: (on: boolean) => void
  destroy: () => void
}

/** Below this, a footprint is a monument object rather than a building. */
export const MONUMENT_MAX_M2 = 10

type Project = (lng: number, lat: number) => [number, number] | null

/**
 * Vertical exaggeration. LoD2 heights are truthful, but at city zoom a 20 m
 * building over a ~700 px viewport is nearly invisible, so the massing reads
 * better nudged up. 1.0 is metrically honest.
 */
const HEIGHT_SCALE = 1.35

export function createBuildings3D(
  canvas: HTMLCanvasElement,
  fc: FeatureCollection<Polygon | MultiPolygon, BuildingProps>,
  project: Project,
  width: number,
  height: number,
  palette: Buildings3DPalette,
): Buildings3DHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height, false)

  const scene = new THREE.Scene()
  // top = 0 / bottom = height puts +y downward, matching SVG's y-down space.
  const camera = new THREE.OrthographicCamera(0, width, 0, height, -1e6, 1e6)

  // Node order mirrors the SVG's transform string exactly:
  //   translate(c) · R · translate(-c) · translate(t) · scale(k)
  // The shear is OUTSIDE the pan/zoom — screen space, pivoting on the viewport
  // centre — so tilting keeps whatever you are looking at in place. Getting
  // this order wrong still renders, it just drifts away from the SVG.
  const pivot = new THREE.Group() // translate(+centre)
  const tilt = new THREE.Group() // R
  const unpivot = new THREE.Group() // translate(-centre)
  const panZoom = new THREE.Group() // the d3 transform
  const recentre = new THREE.Group() // undo the geometry's bbox centring
  scene.add(pivot)
  pivot.add(tilt)
  tilt.add(unpivot)
  unpivot.add(panZoom)
  panZoom.add(recentre)

  // ── Pixels per metre ────────────────────────────────────────
  // Mercator scale barely moves across Berlin, so one factor sampled at the
  // data's centre is plenty.
  const sample = fc.features[0]
  const [sLng, sLat] = firstCoord(sample?.geometry) ?? [13.4, 52.52]
  const a = project(sLng, sLat)
  const b = project(sLng, sLat + 0.001)
  const pxPerMetre = a && b ? Math.abs(b[1] - a[1]) / (0.001 * 111320) : 0.05

  // ── Build one buffer geometry for the lot ───────────────────
  const positions: number[] = []
  const colors: number[] = []

  const roofC = new THREE.Color(palette.roof)
  const wallC = new THREE.Color(palette.wall)
  const monuC = new THREE.Color(palette.monument)
  const tmpC = new THREE.Color()

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  type Ring = [number, number][]
  type Massing = {
    rings: Ring[][]
    /** Where the walls start. Non-zero only for stacked OSM parts. */
    base: number
    /** Where the walls stop and the roof begins. */
    eaves: number
    /** Top of the roof. Equals `eaves` when the roof is flat. */
    top: number
    roof: string
    monument: boolean
  }
  const buildings: Massing[] = []

  for (const f of fc.features) {
    const props = f.properties
    const polys: number[][][][] =
      f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates]
    // The small-footprint rule exists to pick out the Holocaust Memorial's
    // stelae. It must not catch OSM hero parts — a cathedral's colonnade
    // columns are also tiny in plan, and they are not monuments.
    const monument = props?.src !== 'osm' && (props?.footprint_m2 ?? 0) < MONUMENT_MAX_M2
    const unit = pxPerMetre * HEIGHT_SCALE

    // LoD2 features are a footprint and one height — a plain prism. OSM hero
    // features carry min_height and roof_height too, so they rebuild as a
    // stack: wall from base to eaves, then a lofted cap.
    const shape = (props?.roof_shape ?? 'flat').toLowerCase()
    const roofM = ROOF_SOLIDS.has(shape) ? (props?.roof_h_m ?? 0) : 0
    const base = (props?.min_h_m ?? 0) * unit
    const top = Math.max(0.5, props?.height ?? 3) * unit
    const eaves = Math.max(base, top - roofM * unit)

    const projected: Ring[][] = []
    for (const poly of polys) {
      const rings: Ring[] = []
      for (const ring of poly) {
        const pts: Ring = []
        for (const [lng, lat] of ring) {
          const p = project(lng, lat)
          if (!p) continue
          pts.push([p[0], p[1]])
          if (p[0] < minX) minX = p[0]
          if (p[0] > maxX) maxX = p[0]
          if (p[1] < minY) minY = p[1]
          if (p[1] > maxY) maxY = p[1]
        }
        if (pts.length >= 4) rings.push(pts)
      }
      if (rings.length) projected.push(rings)
    }
    if (projected.length) buildings.push({ rings: projected, base, eaves, top, roof: shape, monument })
  }

  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2

  const push = (x: number, y: number, z: number, c: THREE.Color) => {
    positions.push(x - cx, y - cy, z)
    colors.push(c.r, c.g, c.b)
  }

  for (const bldg of buildings) {
    const baseC = bldg.monument ? monuC : wallC
    for (const rings of bldg.rings) {
      const outer = rings[0]
      if (!outer) continue

      // Walls: one quad per edge, shaded by facing so planes read apart —
      // the same trick lod2.py uses for its SVG output. They start at `base`,
      // which is non-zero for a stacked OSM part sitting on the one below.
      if (bldg.eaves > bldg.base + 1e-6) {
        for (const ring of rings) {
          for (let i = 0; i < ring.length - 1; i++) {
            const [x1, y1] = ring[i]
            const [x2, y2] = ring[i + 1]
            const dx = x2 - x1
            const dy = y2 - y1
            const len = Math.hypot(dx, dy) || 1
            // Facing in ground space; the light sits north-west.
            const lambert = Math.max(0, (-dy / len) * 0.55 + (-dx / len) * 0.45)
            tmpC.copy(baseC).multiplyScalar(0.62 + 0.38 * lambert)
            push(x1, y1, bldg.base, tmpC)
            push(x2, y2, bldg.base, tmpC)
            push(x2, y2, bldg.eaves, tmpC)
            push(x1, y1, bldg.base, tmpC)
            push(x2, y2, bldg.eaves, tmpC)
            push(x1, y1, bldg.eaves, tmpC)
          }
        }
      }

      if (bldg.top > bldg.eaves + 1e-6) {
        // Lofted roof: scale the ring toward its centroid as it rises. A
        // quarter-circle profile for a dome, a straight taper for a pyramid.
        // Works on any footprint, which matters because OSM maps the Dom's
        // cupolas as many-sided polygons rather than true circles.
        const pts = outer.slice(0, -1)
        const ccx = pts.reduce((a, p) => a + p[0], 0) / pts.length
        const ccy = pts.reduce((a, p) => a + p[1], 0) / pts.length
        const curved = bldg.roof === 'dome' || bldg.roof === 'onion' || bldg.roof.startsWith('con')
        const steps = curved ? 6 : 1
        const level = (i: number): [number, number] => {
          const t = i / steps
          if (curved) {
            const a = (t * Math.PI) / 2
            return [Math.cos(a), bldg.eaves + (bldg.top - bldg.eaves) * Math.sin(a)]
          }
          return [1 - t, bldg.eaves + (bldg.top - bldg.eaves) * t]
        }
        for (let i = 0; i < steps; i++) {
          const [s0, za] = level(i)
          const [s1, zb] = level(i + 1)
          // Higher rings catch more light, so the curvature reads.
          tmpC.copy(roofC).multiplyScalar(0.78 + 0.28 * (i / steps))
          for (let j = 0; j < pts.length; j++) {
            const [x0, y0] = pts[j]
            const [x1, y1] = pts[(j + 1) % pts.length]
            const ax = ccx + (x0 - ccx) * s0
            const ay = ccy + (y0 - ccy) * s0
            const bx = ccx + (x1 - ccx) * s0
            const by = ccy + (y1 - ccy) * s0
            const cxp = ccx + (x1 - ccx) * s1
            const cyp = ccy + (y1 - ccy) * s1
            const dxp = ccx + (x0 - ccx) * s1
            const dyp = ccy + (y0 - ccy) * s1
            push(ax, ay, za, tmpC)
            push(bx, by, za, tmpC)
            push(cxp, cyp, zb, tmpC)
            if (s1 > 1e-9) {
              push(ax, ay, za, tmpC)
              push(cxp, cyp, zb, tmpC)
              push(dxp, dyp, zb, tmpC)
            }
          }
        }
      } else {
        // Flat cap, triangulated with holes.
        const contour = outer.slice(0, -1).map(([x, y]) => new THREE.Vector2(x, y))
        const holes = rings.slice(1).map((r) => r.slice(0, -1).map(([x, y]) => new THREE.Vector2(x, y)))
        let tris: number[][]
        try {
          tris = THREE.ShapeUtils.triangulateShape(contour, holes)
        } catch {
          tris = [] // degenerate ring — skip the cap, keep the walls
        }
        const all = [...contour, ...holes.flat()]
        for (const t of tris) {
          for (const idx of t) {
            const v = all[idx]
            if (v) push(v.x, v.y, bldg.top, roofC)
          }
        }
      }
    }
  }

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  const material = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })
  const mesh = new THREE.Mesh(geom, material)
  recentre.add(mesh)
  // Geometry is stored relative to its own bbox centre, for float precision at
  // projection-pixel magnitudes; put it back before the zoom sees it.
  recentre.position.set(cx, cy, 0)

  /** Pivot on the viewport centre, matching the SVG's ground affine. */
  function setPivot(w: number, h: number): void {
    pivot.position.set(w / 2, h / 2, 0)
    unpivot.position.set(-w / 2, -h / 2, 0)
  }
  setPivot(width, height)

  // ── View state ──────────────────────────────────────────────
  let azimuth = 0
  let tiltDeg = 0
  let raf = 0

  function applyView(): void {
    const phi = (azimuth * Math.PI) / 180
    const th = (tiltDeg * Math.PI) / 180
    const cp = Math.cos(phi)
    const sp = Math.sin(phi)
    const ct = Math.cos(th)
    const st = Math.sin(th)
    // Rows of the mapping documented at the top of this file.
    const m = new THREE.Matrix4()
    m.set(cp, -sp, 0, 0, sp * ct, cp * ct, -st, 0, sp * st, cp * st, ct, 0, 0, 0, 0, 1)
    tilt.matrixAutoUpdate = false
    tilt.matrix.copy(m)
    schedule()
  }

  function schedule(): void {
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      renderer.render(scene, camera)
    })
  }

  applyView()

  return {
    setTransform(k, x, y) {
      panZoom.position.set(x, y, 0)
      panZoom.scale.set(k, k, k)
      schedule()
    },
    setView(azimuthDeg, newTilt) {
      azimuth = azimuthDeg
      tiltDeg = newTilt
      applyView()
    },
    setSize(w, h) {
      renderer.setSize(w, h, false)
      camera.right = w
      camera.bottom = h
      camera.updateProjectionMatrix()
      setPivot(w, h) // the pivot is the viewport centre, so it moves on resize
      schedule()
    },
    setVisible(on) {
      mesh.visible = on
      schedule()
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf)
      geom.dispose()
      material.dispose()
      renderer.dispose()
    },
  }
}

function firstCoord(g: Polygon | MultiPolygon | undefined): [number, number] | null {
  if (!g) return null
  const c = g.type === 'MultiPolygon' ? g.coordinates[0]?.[0]?.[0] : g.coordinates[0]?.[0]
  return c ? [c[0]!, c[1]!] : null
}
