import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BUILTIN_PRESETS, DEFAULT_PRESET } from './model/preset'
import { loadPresets, savePresets } from './storage'

const names = () => loadPresets().map((p) => p.name)

beforeEach(() => {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('loadPresets', () => {
  it('gives a new device every built-in preset, default first', () => {
    expect(names()).toEqual(BUILTIN_PRESETS.map((p) => p.name))
  })

  it('adds the new built-ins to a device that only has the default, keeping its edits', () => {
    savePresets([{ ...DEFAULT_PRESET, cycleSec: 40 }])
    const list = loadPresets()
    expect(list.map((p) => p.name)).toEqual(BUILTIN_PRESETS.map((p) => p.name))
    expect(list[0].cycleSec).toBe(40)
  })

  it('does not bring back a built-in the user deleted', () => {
    loadPresets()
    savePresets(loadPresets().filter((p) => !p.name.includes('+15')))
    expect(names()).toEqual(
      BUILTIN_PRESETS.filter((p) => !p.name.includes('+15')).map((p) => p.name),
    )
  })

  it('keeps a user preset of the same name instead of adding a duplicate', () => {
    const mine = { ...BUILTIN_PRESETS[1], cycleSec: 99 }
    savePresets([DEFAULT_PRESET, mine])
    const list = loadPresets()
    expect(list.filter((p) => p.name === mine.name)).toEqual([mine])
  })
})
