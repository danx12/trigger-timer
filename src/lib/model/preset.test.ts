import { describe, expect, it } from 'vitest'
import { BUILTIN_PRESETS, DEFAULT_PRESET, type Preset, validatePreset, WAVES } from './preset'

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

describe('built-in presets', () => {
  const byName = (part: string) => {
    const p = BUILTIN_PRESETS.find((b) => b.name.includes(part))
    if (!p) throw new Error(`missing preset ${part}`)
    return p
  }
  const starts = (p: Preset) => p.phases.map((x) => x.startSec)

  it('are the default plus four distinct, valid presets', () => {
    expect(BUILTIN_PRESETS).toHaveLength(5)
    expect(new Set(BUILTIN_PRESETS.map((p) => p.name)).size).toBe(5)
    for (const p of BUILTIN_PRESETS) expect(validatePreset(p)).not.toBeNull()
  })

  it('only lengthen the rest in the standard variants', () => {
    expect(starts(byName('Standard 14 s hold, rest +5'))).toEqual([0, 8, 11, 14])
    expect(byName('Standard 14 s hold, rest +5').cycleSec).toBe(40)
    expect(byName('Standard 14 s hold, rest +15').cycleSec).toBe(50)
  })

  it('give beginners 4 s more to mount and 1 s more to aim', () => {
    const p = byName('Beginner 19 s hold, rest +5')
    expect(starts(p)).toEqual([0, 12, 16, 19])
    expect(p.cycleSec).toBe(45)
    expect(byName('Beginner 19 s hold, rest +15').cycleSec).toBe(55)
  })

  it('keep the green window and rest as long as the standard plus the extra', () => {
    const std = DEFAULT_PRESET.cycleSec - DEFAULT_PRESET.phases[3].startSec
    const p = byName('Beginner 19 s hold, rest +15')
    expect(p.cycleSec - p.phases[3].startSec).toBe(std + 15)
    expect(p.phases[3].startSec - p.phases[2].startSec).toBe(3)
  })

  it('do not change the default', () => {
    expect(starts(DEFAULT_PRESET)).toEqual([0, 8, 11, 14])
    expect(DEFAULT_PRESET.cycleSec).toBe(35)
  })
})
