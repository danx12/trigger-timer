import { describe, expect, it } from 'vitest'
import { CUE_MODES, cueMode, modeFlags } from './cues'

describe('cue modes', () => {
  it.each([
    [{ tones: true, speak: true }, 'both'],
    [{ tones: true, speak: false }, 'tones'],
    [{ tones: false, speak: true }, 'voice'],
    [{ tones: false, speak: false }, 'visual'],
  ])('%j is %s', (flags, mode) => {
    expect(cueMode(flags)).toBe(mode)
  })

  it('round-trips every mode', () => {
    for (const { id } of CUE_MODES) expect(cueMode(modeFlags(id))).toBe(id)
  })
})
