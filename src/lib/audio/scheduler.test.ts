import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_PRESET } from '../model/preset'

vi.mock('./cues', () => ({ playCue: vi.fn(), cueLength: () => 0.25 }))

import { phaseAt, planCycles, Scheduler } from './scheduler'

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

describe('Scheduler interruptions', () => {
  const setup = () => {
    const ctx = { currentTime: 0, state: 'running', resume: vi.fn(() => Promise.resolve()) }
    let wall = 0
    vi.spyOn(performance, 'now').mockImplementation(() => wall)
    vi.stubGlobal('window', { setInterval: () => 1, clearInterval: () => {} })
    const played: number[] = []
    const s = new Scheduler(ctx as unknown as AudioContext, {} as AudioNode, () => DEFAULT_PRESET)
    s.onCue = (e) => played.push(e.time)
    s.start(0.1)
    const advance = (sec: number, audioRuns: boolean) => {
      wall += sec * 1000
      if (audioRuns) ctx.currentTime += sec
    }
    const tick = () => (s as unknown as { tick(): void }).tick()
    return { ctx, s, played, advance, tick }
  }

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('keeps counting on the wall clock while the audio clock is stopped, and retries resume()', () => {
    const { ctx, s, advance, tick } = setup()
    advance(1, true)
    ctx.state = 'interrupted'
    advance(2, false)
    tick()
    expect(s.elapsed()).toBeCloseTo(2.9, 1)
    expect(ctx.resume).toHaveBeenCalled()
  })

  it('realigns to the wall clock after resuming and skips cues missed meanwhile', () => {
    const { ctx, s, played, advance, tick } = setup()
    tick()
    expect(played).toEqual([0.1])
    advance(1, true)
    ctx.state = 'interrupted'
    advance(9, false)
    tick()
    ctx.state = 'running'
    tick()
    expect(s.elapsed()).toBeCloseTo(9.9, 1)
    // the aim cue (8 s) was missed while stopped, so only later ones play
    expect(played).toEqual([0.1])
    advance(1.2, true)
    tick()
    expect(played.length).toBe(2)
  })
})
