import type { Phase, Preset } from '../model/preset'

export type Lang = 'en' | 'de'

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'de', label: 'Deutsch' },
]

/** Spoken words that ship as audio files in public/voice/<lang> (see scripts/generate-voice.py). */
export const VOICE_KEYS = ['mount', 'aim', 'green', 'abort', 'rest'] as const
export type VoiceKey = (typeof VOICE_KEYS)[number]

/** What each clip says. Keep in sync with PHRASES in scripts/generate-voice.py. */
export const PHRASES: Record<Lang, Record<VoiceKey, string>> = {
  en: { mount: 'Mount', aim: 'Aim', green: 'Squeeze', abort: 'Abort', rest: 'Rest' },
  de: { mount: 'Anschlag', aim: 'Zielen', green: 'Abziehen', abort: 'Absetzen', rest: 'Pause' },
}

const norm = (s: string) => s.trim().toLowerCase()

/**
 * The clip for a phase's saved `speak` text: its key (which is also the English word earlier versions saved, such
 * as "Mount"), either language's phrase, or null if there is none.
 */
export function clipKey(text: string): VoiceKey | null {
  const t = norm(text)
  if (!t) return null
  for (const key of VOICE_KEYS) {
    if (t === key || t === norm(PHRASES.en[key]) || t === norm(PHRASES.de[key])) return key
  }
  return null
}

export function defaultLang(): Lang {
  const l = typeof navigator !== 'undefined' ? navigator.language : ''
  return l.toLowerCase().startsWith('de') ? 'de' : 'en'
}

/** Phases that speak something for which there is no clip (an old free-text cue). */
export const phasesWithoutClip = (preset: Preset): Phase[] =>
  preset.phases.filter((p) => p.speak.trim() !== '' && clipKey(p.speak) === null)

export type VoiceBank = Map<VoiceKey, AudioBuffer>

/** Fetches and decodes the clips the preset uses. Missing or undecodable clips are simply left out. */
export async function loadVoices(
  ctx: BaseAudioContext,
  preset: Preset,
  lang: Lang,
): Promise<VoiceBank> {
  const keys = new Set(preset.phases.map((p) => clipKey(p.speak)).filter((k) => k !== null))
  const bank: VoiceBank = new Map()
  await Promise.all(
    [...keys].map(async (key) => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}voice/${lang}/${key}.wav`)
        if (!res.ok) return
        bank.set(key, await ctx.decodeAudioData(await res.arrayBuffer()))
      } catch {
        // that phase just has no voice
      }
    }),
  )
  return bank
}

export function voiceFor(bank: VoiceBank, phase: Phase): AudioBuffer | undefined {
  const key = clipKey(phase.speak)
  return key ? bank.get(key) : undefined
}

/** Schedules a clip at ctx time `when`; returns its end time. */
export function playClip(
  ctx: BaseAudioContext,
  dest: AudioNode,
  buffer: AudioBuffer,
  when: number,
  volume = 0.9,
): number {
  const src = ctx.createBufferSource()
  const gain = ctx.createGain()
  gain.gain.value = volume
  src.buffer = buffer
  src.connect(gain).connect(dest)
  src.start(when)
  return when + buffer.duration
}
