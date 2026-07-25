/**
 * WebGL building massing, drawn under the SVG basemap.
 *
 * The geometry is Berlin's official LoD2 model — real wall and roof surfaces,
 * not footprints — baked to a GLB by `lod2.py glb` in the
 * berlin-architecture-geometry repo, with OSM Simple 3D Buildings standing in
 * for the eight landmarks LoD2 flattens or omits (Berliner Dom, Reichstag,
 * Brandenburger Tor and five more).
 *
 * This file used to extrude prisms from GeoJSON footprints, which threw away
 * every pitched roof, mansard and dome in the city. Baking the surfaces
 * instead moved all of that work offline: 87,750 triangles arrive ready to
 * draw, and this module only has to place them.
 *
 * ── Coordinates ─────────────────────────────────────────────────────────
 * The GLB is in local ENU metres (X east, Y north, Z up) about a lon/lat
 * origin carried in its `extras` — deliberately not UTM, whose grid north is
 * up to a degree off true north in Berlin and would skew the scene against a
 * Mercator basemap. Placing it means projecting that one origin, working out
 * pixels per metre, and flipping Y because screen north is negative.
 *
 * ── Staying glued to the 2D map ─────────────────────────────────────────
 * The camera is ORTHOGRAPHIC, which is what makes this tractable. Under an
 * orthographic camera the ground plane maps to the screen by a plain 2D
 * affine — spin by the azimuth, squash vertically by cos(tilt). No perspective
 * divide. So the SVG goes through the *same* affine via its root transform and
 * the two stay registered at any zoom, pan, tilt or spin.
 *
 *   X = x·cosφ − y·sinφ
 *   Y = (x·sinφ + y·cosφ)·cosθ − h·sinθ
 *   Z = (x·sinφ + y·cosφ)·sinθ + h·cosθ        (depth, for the z-buffer)
 *
 * `groundSvgTransform()` in createBerlinMap.ts is the h = 0 case of exactly
 * this, applied in screen space after the zoom. Node order below mirrors it.
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

export type Buildings3DPalette = {
  roof: string
  wall: string
  /** Monument objects — chiefly the Holocaust Memorial's 1,989 stelae. */
  monument: string
}

export type Buildings3DHandle = {
  /** Mirror the d3 zoom transform. */
  setTransform: (k: number, x: number, y: number) => void
  setView: (azimuthDeg: number, tiltDeg: number) => void
  setSize: (width: number, height: number) => void
  setVisible: (on: boolean) => void
  setPalette: (palette: Buildings3DPalette) => void
  destroy: () => void
}

type Project = (lng: number, lat: number) => [number, number] | null

/**
 * Vertical exaggeration. LoD2 heights are truthful, but at city zoom a 20 m
 * building over a ~700 px viewport barely registers, so the massing reads
 * better nudged up. 1.0 is metrically honest.
 */
const HEIGHT_SCALE = 1.35

export async function createBuildings3D(
  canvas: HTMLCanvasElement,
  url: string,
  project: Project,
  width: number,
  height: number,
  palette: Buildings3DPalette,
): Promise<Buildings3DHandle> {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  const gltf = await loader.loadAsync(url)

  const extras = (gltf.parser.json.extras ?? {}) as { originLon?: number; originLat?: number }
  const originLon = extras.originLon ?? 13.4
  const originLat = extras.originLat ?? 52.52

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height, false)

  const scene = new THREE.Scene()
  // top = 0 / bottom = height puts +y downward, matching SVG's y-down space.
  const camera = new THREE.OrthographicCamera(0, width, 0, height, -1e6, 1e6)

  const pivot = new THREE.Group() // translate(+viewport centre)
  const tilt = new THREE.Group() // R
  const unpivot = new THREE.Group() // translate(-viewport centre)
  const panZoom = new THREE.Group() // the d3 transform
  const anchor = new THREE.Group() // ENU metres -> projection pixels
  scene.add(pivot)
  pivot.add(tilt)
  tilt.add(unpivot)
  unpivot.add(panZoom)
  panZoom.add(anchor)
  anchor.add(gltf.scene)

  // ── Anchor the model ────────────────────────────────────────
  const o = project(originLon, originLat)
  const north = project(originLon, originLat + 0.001)
  const pxPerMetre = o && north ? Math.abs(north[1] - o[1]) / (0.001 * 111320) : 0.05
  if (o) anchor.position.set(o[0], o[1], 0)
  // Y is negated: the model's +north is up, the screen's +y is down.
  anchor.scale.set(pxPerMetre, -pxPerMetre, pxPerMetre * HEIGHT_SCALE)

  // ── Tint ────────────────────────────────────────────────────
  // Materials arrive unlit and white, with COLOR_0 carrying only a shading
  // factor, so setting the material colour retints per theme without touching
  // geometry. Names come from the exporter's primitives.
  const byName = new Map<string, THREE.MeshBasicMaterial>()
  gltf.scene.traverse((n) => {
    const mesh = n as THREE.Mesh
    if (!mesh.isMesh) return
    const mat = mesh.material as THREE.MeshBasicMaterial
    mat.side = THREE.DoubleSide // the negative Y scale flips winding
    if (mat.name) byName.set(mat.name, mat)
  })

  function applyPalette(p: Buildings3DPalette): void {
    byName.get('roof')?.color.set(p.roof)
    byName.get('wall')?.color.set(p.wall)
    byName.get('monument')?.color.set(p.monument)
  }
  applyPalette(palette)

  // ── View state ──────────────────────────────────────────────
  let azimuth = 0
  let tiltDeg = 0
  let raf = 0

  function setPivot(w: number, h: number): void {
    pivot.position.set(w / 2, h / 2, 0)
    unpivot.position.set(-w / 2, -h / 2, 0)
  }
  setPivot(width, height)

  function schedule(): void {
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      renderer.render(scene, camera)
    })
  }

  function applyView(): void {
    const phi = (azimuth * Math.PI) / 180
    const th = (tiltDeg * Math.PI) / 180
    const cp = Math.cos(phi)
    const sp = Math.sin(phi)
    const ct = Math.cos(th)
    const st = Math.sin(th)
    const m = new THREE.Matrix4()
    m.set(cp, -sp, 0, 0, sp * ct, cp * ct, -st, 0, sp * st, cp * st, ct, 0, 0, 0, 0, 1)
    tilt.matrixAutoUpdate = false
    tilt.matrix.copy(m)
    schedule()
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
      gltf.scene.visible = on
      schedule()
    },
    setPalette(p) {
      applyPalette(p)
      schedule()
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf)
      gltf.scene.traverse((n) => {
        const mesh = n as THREE.Mesh
        if (mesh.isMesh) {
          mesh.geometry.dispose()
          const mat = mesh.material
          if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose())
          else mat.dispose()
        }
      })
      renderer.dispose()
    },
  }
}
