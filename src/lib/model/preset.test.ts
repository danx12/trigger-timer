import { describe, expect, it } from 'vitest'
import { DEFAULT_PRESET, validatePreset, WAVES } from './preset'

const cue = (id: string) => {
  const phase = DEFAULT_PRESET.phases.find((p) => p.id === id)
  if (!phase) throw new Error(`missing phase ${id}`)
  return phase.cue
}

describe('default tones', () => {
  it('are valid and single soft tones (no sequences)', () => {
    expect(validatePreset(DEFAULT_PRESET)).not.toBeNull()
    for (const { cue } of DEFAULT_PRESET.phases) {
      expect(cue.repeats).toBe(1)
      expect(WAVES).toContain(cue.wave)
      expect(cue.volume).toBeLessThanOrEqual(0.5)
    }
  })

  it('rise in pitch from mount to aim to green', () => {
    expect(cue('mount').freq).toBeLessThan(cue('aim').freq)
    expect(cue('aim').freq).toBeLessThan(cue('green').freq)
  })

  it('use the lowest pitch for abort', () => {
    for (const id of ['mount', 'aim', 'green']) expect(cue('abort').freq).toBeLessThan(cue(id).freq)
  })
})
