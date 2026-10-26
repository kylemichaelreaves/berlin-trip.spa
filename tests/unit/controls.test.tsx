import { render } from 'solid-js/web'
import type { JSX } from 'solid-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CatGlyph } from '../../src/ui/CatGlyph'
import { MassingControl } from '../../src/ui/MassingControl'
import { Toggle } from '../../src/ui/Toggle'

let dispose: (() => void) | undefined
afterEach(() => {
  dispose?.()
  document.body.innerHTML = ''
})

function mount(view: () => JSX.Element) {
  const host = document.createElement('div')
  document.body.append(host)
  dispose = render(view, host)
  return host
}

describe('Toggle', () => {
  it('paints the track for off, on, and on-with-accent', () => {
    const off = mount(() => <Toggle />).querySelector('button')!
    expect(off.style.background).toBe('var(--wf-paper-2)')
    dispose?.()
    const on = mount(() => <Toggle on />).querySelector('button')!
    expect(on.style.background).toBe('var(--wf-ink)')
    dispose?.()
    const onClick = vi.fn()
    const accent = mount(() => <Toggle on accentOn onClick={onClick} />).querySelector('button')!
    expect(accent.style.background).toBe('var(--wf-accent)')
    accent.click()
    expect(onClick).toHaveBeenCalledOnce()
  })
})

describe('MassingControl', () => {
  const base = { azimuth: 30, tilt: 45, onToggle: vi.fn(), onAzimuth: vi.fn(), onTilt: vi.fn() }

  it('shows off, loading and on states', () => {
    const status = (host: HTMLElement) => host.querySelector('button span:last-child')!.textContent
    expect(status(mount(() => <MassingControl {...base} on={false} loading={false} />))).toBe('○')
    dispose?.()
    expect(status(mount(() => <MassingControl {...base} on={false} loading />))).toBe('···')
    dispose?.()
    expect(status(mount(() => <MassingControl {...base} on loading={false} />))).toBe('●')
  })

  it('toggles, and only offers the view sliders while on', () => {
    const onToggle = vi.fn()
    const off = mount(() => <MassingControl {...base} onToggle={onToggle} on={false} loading={false} />)
    expect(off.querySelectorAll('input')).toHaveLength(0)
    off.querySelector('button')!.click()
    expect(onToggle).toHaveBeenCalledOnce()
    dispose?.()
    const on = mount(() => <MassingControl {...base} on loading={false} />)
    expect(on.querySelectorAll('input').length).toBeGreaterThan(0)
  })
})

describe('CatGlyph', () => {
  it('draws each category in its own shape', () => {
    const tag = (cat: Parameters<typeof CatGlyph>[0]['cat']) => {
      const host = mount(() => <CatGlyph cat={cat} size={20} />)
      const el = host.querySelector('svg > *')!.tagName
      dispose?.()
      return el
    }
    expect(tag('philosophy')).toBe('circle')
    expect(tag('base')).toBe('rect')
    expect(tag('history')).toBe('polygon')
  })

  it('goes paper-white when the category is switched off', () => {
    const host = mount(() => <CatGlyph cat="philosophy" colorOn={false} />)
    expect(host.querySelector('svg > *')!.getAttribute('fill')).toBe('var(--wf-paper-2)')
    expect(host.querySelector('svg')!.getAttribute('width')).toBe('16')
  })
})
