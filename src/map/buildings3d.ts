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
}

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
  const buildings: { rings: Ring[][]; h: number; monument: boolean }[] = []

  for (const f of fc.features) {
    const props = f.properties
    const polys: number[][][][] =
      f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates]
    const monument = (props?.footprint_m2 ?? 0) < MONUMENT_MAX_M2
    const h = Math.max(0.5, props?.height ?? 3) * pxPerMetre * HEIGHT_SCALE

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
    if (projected.length) buildings.push({ rings: projected, h, monument })
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
      // the same trick lod2.py uses for its SVG output.
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
          push(x1, y1, 0, tmpC)
          push(x2, y2, 0, tmpC)
          push(x2, y2, bldg.h, tmpC)
          push(x1, y1, 0, tmpC)
          push(x2, y2, bldg.h, tmpC)
          push(x1, y1, bldg.h, tmpC)
        }
      }

      // Roof cap, triangulated with holes.
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
          if (v) push(v.x, v.y, bldg.h, roofC)
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
