import { describe, expect, it } from 'vitest'
import { DEFAULT_PRESET } from '../model/preset'
import { clipKey, defaultLang, LANGS, PHRASES, phasesWithoutClip, VOICE_KEYS } from './voice'

describe('voice clips', () => {
  it('maps the default phases to their clips', () => {
    expect(DEFAULT_PRESET.phases.map((p) => clipKey(p.speak))).toEqual([
      'mount',
      'aim',
      'green',
      'abort',
    ])
  })

  it('still understands the words saved by earlier versions, ignoring case and spaces', () => {
    expect(clipKey('Mount')).toBe('mount')
    expect(clipKey('  GREEN ')).toBe('green')
    expect(clipKey('Abort')).toBe('abort')
  })

  it('accepts either language phrase', () => {
    expect(clipKey('Abziehen')).toBe('green')
    expect(clipKey('squeeze')).toBe('green')
    expect(clipKey('Anschlag')).toBe('mount')
  })

  it('has no clip for empty or custom text', () => {
    expect(clipKey('')).toBeNull()
    expect(clipKey('Load and breathe')).toBeNull()
  })

  it('lists only the phases whose custom text has no clip', () => {
    const p = structuredClone(DEFAULT_PRESET)
    expect(phasesWithoutClip(p)).toEqual([])
    p.phases[1].speak = 'Breathe'
    p.phases[2].speak = ''
    expect(phasesWithoutClip(p).map((x) => x.id)).toEqual(['aim'])
  })

  it('has a phrase for every key in every language', () => {
    for (const { id } of LANGS) {
      expect(Object.keys(PHRASES[id]).sort()).toEqual([...VOICE_KEYS].sort())
    }
  })

  it('defaults to German only for German locales', () => {
    const set = (language: string) =>
      Object.defineProperty(globalThis, 'navigator', { value: { language }, configurable: true })
    set('de-AT')
    expect(defaultLang()).toBe('de')
    set('en-GB')
    expect(defaultLang()).toBe('en')
  })
})
