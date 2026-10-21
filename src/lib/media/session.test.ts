import { describe, expect, it } from 'vitest'
import { silentWav } from './session'

describe('silentWav', () => {
  it('produces a valid, near-silent 16-bit mono WAV', () => {
    const w = silentWav()
    const v = new DataView(w.buffer)
    const text = (o: number, n: number) => String.fromCharCode(...w.slice(o, o + n))
    expect(text(0, 4)).toBe('RIFF')
    expect(text(8, 4)).toBe('WAVE')
    expect(v.getUint32(4, true)).toBe(w.length - 8)
    expect(v.getUint32(40, true)).toBe(w.length - 44)
    const peak = Math.max(
      ...Array.from({ length: 100 }, (_, i) => Math.abs(v.getInt16(44 + i * 2, true))),
    )
    expect(peak).toBe(1)
  })
})
