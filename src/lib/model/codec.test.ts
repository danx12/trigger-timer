import { describe, expect, it } from 'vitest'
import { decodePreset, encodePreset, presetFromHash } from './codec'
import { DEFAULT_PRESET, validatePreset } from './preset'

describe('codec', () => {
  it('round-trips the default preset', () => {
    expect(decodePreset(encodePreset(DEFAULT_PRESET))).toEqual(DEFAULT_PRESET)
  })

  it('round-trips unicode names and produces url-safe output', () => {
    const p = { ...DEFAULT_PRESET, name: 'Disparo ñ 🎯' }
    const enc = encodePreset(p)
    expect(enc).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(decodePreset(enc)?.name).toBe('Disparo ñ 🎯')
  })

  it('rejects garbage and tampered presets', () => {
    expect(decodePreset('not base64 !!')).toBeNull()
    expect(decodePreset(btoa('{"v":2}'))).toBeNull()
    const bad = structuredClone(DEFAULT_PRESET)
    bad.roles.aim = 'missing'
    expect(validatePreset(bad)).toBeNull()
    const late = structuredClone(DEFAULT_PRESET)
    late.phases[0].startSec = 99
    expect(validatePreset(late)).toBeNull()
  })

  it('reads the preset from a location hash', () => {
    const hash = `#p=${encodePreset(DEFAULT_PRESET)}`
    expect(presetFromHash(hash)?.name).toBe(DEFAULT_PRESET.name)
    expect(presetFromHash('#other')).toBeNull()
  })
})
