import type { Phase, Preset } from '../model/preset'

/** Spoken words that ship as audio files in public/voice (see scripts/generate-voice.py). */
export const VOICE_WORDS = ['mount', 'aim', 'green', 'abort', 'rest'] as const

/** The clip name for a spoken-cue text, or null if it needs the system speech engine. */
export function clipFor(text: string): string | null {
  const k = text.trim().toLowerCase()
  return (VOICE_WORDS as readonly string[]).includes(k) ? k : null
}

/** True if any phase speaks text that has no built-in clip. */
export function needsSpeechEngine(preset: Preset): boolean {
  return preset.phases.some((p) => p.speak.trim() !== '' && clipFor(p.speak) === null)
}

export type VoiceBank = Map<string, AudioBuffer>

/** Fetches and decodes the clips the preset uses. Missing or undecodable clips are simply left out. */
export async function loadVoices(ctx: BaseAudioContext, preset: Preset): Promise<VoiceBank> {
  const names = new Set(
    preset.phases.map((p) => clipFor(p.speak)).filter((n): n is string => n !== null),
  )
  const bank: VoiceBank = new Map()
  await Promise.all(
    [...names].map(async (name) => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}voice/${name}.wav`)
        if (!res.ok) return
        bank.set(name, await ctx.decodeAudioData(await res.arrayBuffer()))
      } catch {
        // fall back to the speech engine
      }
    }),
  )
  return bank
}

export const voiceFor = (bank: VoiceBank, phase: Phase): AudioBuffer | undefined => {
  const name = clipFor(phase.speak)
  return name ? bank.get(name) : undefined
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
