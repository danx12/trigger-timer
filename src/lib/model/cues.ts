/** What announces each phase: the tone, a spoken word, both, or nothing but the screen. */
export type CueMode = 'both' | 'tones' | 'voice' | 'visual'

export const CUE_MODES: { id: CueMode; label: string }[] = [
  { id: 'both', label: 'Tones + voice' },
  { id: 'tones', label: 'Tones only' },
  { id: 'voice', label: 'Voice only' },
  { id: 'visual', label: 'Visual only' },
]

export interface CueFlags {
  tones: boolean
  speak: boolean
}

export function cueMode({ tones, speak }: CueFlags): CueMode {
  if (tones) return speak ? 'both' : 'tones'
  return speak ? 'voice' : 'visual'
}

export function modeFlags(mode: CueMode): CueFlags {
  return { tones: mode === 'both' || mode === 'tones', speak: mode === 'both' || mode === 'voice' }
}
