import { describe, expect, it } from 'vitest'
import { pickVoice } from './speech'

const v = (lang: string) => ({ lang, name: lang })

describe('pickVoice', () => {
  it('prefers an exact language match (ignoring case and underscores)', () => {
    expect(pickVoice([v('en-GB'), v('es-ES'), v('es_MX')], 'es-mx')?.lang).toBe('es_MX')
  })

  it('falls back to the same primary language', () => {
    expect(pickVoice([v('en-US'), v('es-ES')], 'es-AR')?.lang).toBe('es-ES')
  })

  it('falls back to any English voice, then to nothing', () => {
    expect(pickVoice([v('fr-FR'), v('en-AU')], 'de-DE')?.lang).toBe('en-AU')
    expect(pickVoice([v('fr-FR')], 'de-DE')).toBeUndefined()
    expect(pickVoice([], 'en-US')).toBeUndefined()
  })
})
