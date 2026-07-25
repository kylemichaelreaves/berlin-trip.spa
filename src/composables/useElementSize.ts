import { createSignal, onCleanup } from 'solid-js'

export type ElementSize = { w: number; h: number }

/**
 * Tracks the content box of a DOM element via {@link ResizeObserver}.
 * Call the returned ref setter from a `ref` callback whenever the element mounts or updates.
 */
export function useElementSize() {
  const [dims, setDims] = createSignal<ElementSize>({ w: 0, h: 0 })
  let detach: (() => void) | undefined
  /** Bumped on detach and each new attach so stale microtasks / callbacks ignore prior elements. */
  let attachGeneration = 0

  function attachElement(el: HTMLElement | undefined) {
    detach?.()
    detach = undefined
    if (!el) return

    attachGeneration += 1
    const generation = attachGeneration
    const observedEl = el

    const apply = (cr: DOMRectReadOnly) => {
      if (generation !== attachGeneration) return
      setDims({ w: Math.floor(cr.width), h: Math.floor(cr.height) })
    }

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry || entry.target !== observedEl || generation !== attachGeneration) return
      const cr = entry.contentRect
      apply(cr)
    })
    ro.observe(observedEl)

    queueMicrotask(() => {
      if (generation !== attachGeneration) return
      setDims({ w: Math.floor(observedEl.clientWidth), h: Math.floor(observedEl.clientHeight) })
    })

    detach = () => {
      ro.disconnect()
      attachGeneration += 1
    }
  }

  onCleanup(() => {
    detach?.()
    detach = undefined
  })

  return [dims, attachElement] as const
}
