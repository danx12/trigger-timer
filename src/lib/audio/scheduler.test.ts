import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_PRESET } from '../model/preset'

vi.mock('./cues', () => ({ playCue: vi.fn(), cueLength: () => 0.25 }))
vi.mock('./voice', () => ({
  playClip: vi.fn((_c: unknown, _d: unknown, b: AudioBuffer, when: number) => when + b.duration),
}))

import { playCue } from './cues'
import { phaseAt, planCycles, Scheduler } from './scheduler'
import { playClip } from './voice'

describe('phaseAt', () => {
  it.each([
    [0, 'mount', 0],
    [7.99, 'mount', 0],
    [8, 'aim', 0],
    [11.5, 'green', 0],
    [14, 'abort', 0],
    [34.9, 'abort', 0],
    [35, 'mount', 1],
    [78, 'aim', 2],
  ])('t=%f → %s (cycle %i)', (t, id, cycle) => {
    const pos = phaseAt(DEFAULT_PRESET, t)
    expect(pos.phase.id).toBe(id)
    expect(pos.cycle).toBe(cycle)
  })

  it('reports time remaining in the phase', () => {
    expect(phaseAt(DEFAULT_PRESET, 9).remaining).toBeCloseTo(2)
    expect(phaseAt(DEFAULT_PRESET, 20).remaining).toBeCloseTo(15)
  })
})

describe('planCycles', () => {
  it('lists cue times offset by t0 and cycle length', () => {
    const times = planCycles(DEFAULT_PRESET, 10, 0, 2).map((e) => e.time)
    expect(times).toEqual([10, 18, 21, 24, 45, 53, 56, 59])
  })
})

describe('Scheduler cue modes', () => {
  const buffer = { duration: 0.6 } as AudioBuffer
  const run = (tones: boolean, voice: boolean) => {
    vi.mocked(playCue).mockClear()
    vi.mocked(playClip).mockClear()
    vi.stubGlobal('window', { setInterval: () => 1, clearInterval: () => {} })
    const ctx = { currentTime: 0 } as AudioContext
    const s = new Scheduler(
      ctx,
      {} as AudioNode,
      () => DEFAULT_PRESET,
      () => tones,
      () => (voice ? buffer : undefined),
    )
    s.start(0)
    return s
  }

  afterEach(() => vi.unstubAllGlobals())

  it('plays tone and clip together', () => {
    const s = run(true, true)
    expect(playCue).toHaveBeenCalledTimes(1)
    expect(playClip).toHaveBeenCalledTimes(1)
    expect(s.inCueWindow(0.5)).toBe(true)
  })

  it('plays only the tone', () => {
    run(true, false)
    expect(playCue).toHaveBeenCalledTimes(1)
    expect(playClip).not.toHaveBeenCalled()
  })

  it('plays only the clip', () => {
    const s = run(false, true)
    expect(playCue).not.toHaveBeenCalled()
    expect(playClip).toHaveBeenCalledTimes(1)
    expect(s.inCueWindow(0.5)).toBe(true)
  })

  it('stays silent and opens no click-gate window when visual only', () => {
    const s = run(false, false)
    expect(playCue).not.toHaveBeenCalled()
    expect(playClip).not.toHaveBeenCalled()
    expect(s.inCueWindow(0.1)).toBe(false)
  })

  it('still reports the cue', () => {
    const cues: string[] = []
    vi.stubGlobal('window', { setInterval: () => 1, clearInterval: () => {} })
    const s = new Scheduler(
      { currentTime: 0 } as AudioContext,
      {} as AudioNode,
      () => DEFAULT_PRESET,
      () => false,
    )
    s.onCue = (e) => cues.push(e.phase.id)
    s.start(0)
    expect(cues).toEqual(['mount'])
  })
})
