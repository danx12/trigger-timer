import { describe, expect, it } from 'vitest'
import { DEFAULT_PRESET } from '../model/preset'
import { clipFor, needsSpeechEngine } from './voice'

describe('voice clips', () => {
  it('maps the default spoken cues to clips, ignoring case and spaces', () => {
    expect(DEFAULT_PRESET.phases.map((p) => clipFor(p.speak))).toEqual([
      'mount',
      'aim',
      'green',
      'abort',
    ])
    expect(clipFor('  GREEN ')).toBe('green')
  })

  it('needs the speech engine only for custom text', () => {
    expect(needsSpeechEngine(DEFAULT_PRESET)).toBe(false)
    const custom = structuredClone(DEFAULT_PRESET)
    custom.phases[0].speak = 'Load and breathe'
    expect(needsSpeechEngine(custom)).toBe(true)
    custom.phases[0].speak = ''
    expect(needsSpeechEngine(custom)).toBe(false)
  })
})
