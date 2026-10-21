import { describe, expect, it } from 'vitest'
import { OnsetDetector } from './onset'

const SR = 48000

function noise(n: number, amp: number, seed = 1): Float32Array {
  let s = seed
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) >>> 0
    out[i] = (s / 0xffffffff - 0.5) * 2 * amp
  }
  return out
}

/** A click: a few ms of decaying high-frequency burst. */
function addClick(buf: Float32Array, at: number, amp = 0.8) {
  for (let i = 0; i < 0.004 * SR; i++) {
    buf[at + i] += (i % 2 ? 1 : -1) * amp * Math.exp(-i / (0.001 * SR))
  }
}

function run(buf: Float32Array, threshold = 0.05) {
  const det = new OnsetDetector(SR, { threshold })
  const out = []
  for (let i = 0; i < buf.length; i += 128) out.push(...det.process(buf.subarray(i, i + 128), i))
  return out
}

describe('OnsetDetector', () => {
  it('detects clicks with accurate timing', () => {
    const buf = noise(SR * 3, 0.005)
    addClick(buf, SR * 1)
    addClick(buf, SR * 2)
    const hits = run(buf)
    expect(hits).toHaveLength(2)
    expect(Math.abs(hits[0].frame - SR)).toBeLessThan(0.002 * SR)
    expect(Math.abs(hits[1].frame - 2 * SR)).toBeLessThan(0.002 * SR)
  })

  it('ignores background noise', () => {
    expect(run(noise(SR * 3, 0.01))).toHaveLength(0)
  })

  it('rejects sustained loud sounds such as tones and speech', () => {
    const buf = noise(SR * 2, 0.005)
    for (let i = 0; i < 0.3 * SR; i++) buf[SR + i] += 0.4 * Math.sin((2 * Math.PI * 3000 * i) / SR)
    expect(run(buf)).toHaveLength(0)
  })

  it('applies the refractory period to rapid double clicks', () => {
    const buf = noise(SR * 2, 0.005)
    addClick(buf, SR)
    addClick(buf, SR + 0.1 * SR)
    expect(run(buf)).toHaveLength(1)
  })

  it('respects the absolute threshold', () => {
    const buf = noise(SR * 2, 0.002)
    addClick(buf, SR, 0.1)
    expect(run(buf, 0.9)).toHaveLength(0)
  })
})
