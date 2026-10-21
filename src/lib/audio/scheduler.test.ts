import { describe, expect, it } from 'vitest'
import { DEFAULT_PRESET } from '../model/preset'
import { phaseAt, planCycles } from './scheduler'

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
