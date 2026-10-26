import { createSignal, onCleanup, type Accessor } from 'solid-js'

/** Live `matchMedia` result, e.g. `useMediaQuery('(max-width: 767px)')`. */
export function useMediaQuery(query: string): Accessor<boolean> {
  const mql = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query) : null
  const [matches, setMatches] = createSignal(mql?.matches ?? false)
  if (mql) {
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', onChange)
    onCleanup(() => mql.removeEventListener('change', onChange))
  }
  return matches
}
