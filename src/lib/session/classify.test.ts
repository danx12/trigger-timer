import { describe, expect, it } from 'vitest'
import { DEFAULT_PRESET } from '../model/preset'
import { classifyShot } from './classify'

describe('classifyShot', () => {
  it.each([
    [3, 'before-aim'],
    [9, 'early'],
    [10.99, 'early'],
    [11, 'green'],
    [13.9, 'green'],
    [14.4, 'late'],
    [20, 'rest'],
  ])('shot at %f s → %s', (t, result) => {
    expect(classifyShot(DEFAULT_PRESET, 0, t).result).toBe(result)
  })

  it('reports hold relative to the aim cue', () => {
    expect(classifyShot(DEFAULT_PRESET, 2, 12.5).hold).toBeCloseTo(4.5)
  })
})
