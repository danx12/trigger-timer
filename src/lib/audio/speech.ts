const supported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

/** Picks the best voice for `lang`: exact match, then same language, then any English voice. */
export function pickVoice<T extends { lang: string }>(voices: T[], lang: string): T | undefined {
  const norm = (s: string) => s.toLowerCase().replace('_', '-')
  const want = norm(lang)
  const primary = want.split('-')[0]
  return (
    voices.find((v) => norm(v.lang) === want) ??
    voices.find((v) => norm(v.lang).split('-')[0] === primary) ??
    voices.find((v) => norm(v.lang).startsWith('en'))
  )
}

let voices: SpeechSynthesisVoice[] = []

function refreshVoices(): void {
  voices = window.speechSynthesis.getVoices()
}

/**
 * iOS Safari only lets speechSynthesis speak after a speak() made synchronously inside a tap; cues fired later from
 * timers are otherwise dropped silently. Call this first thing in the Start handler, before any `await`.
 */
export function primeSpeech(): void {
  if (!supported()) return
  refreshVoices()
  window.speechSynthesis.addEventListener('voiceschanged', refreshVoices)
  window.speechSynthesis.resume()
  const u = new SpeechSynthesisUtterance(' ')
  u.volume = 0
  window.speechSynthesis.speak(u)
}

/** Speaks a short phrase. Not sample-accurate, so it complements (never replaces) the tone cue. */
export function speak(text: string, volume = 1, onStatus?: (status: string) => void): void {
  if (!text || !supported()) return
  const synth = window.speechSynthesis
  const u = new SpeechSynthesisUtterance(text)
  u.volume = volume
  u.rate = 1.15
  const voice = pickVoice(voices.length ? voices : synth.getVoices(), navigator.language || 'en-US')
  if (voice) {
    u.voice = voice
    u.lang = voice.lang
  }
  u.onstart = () => onStatus?.(`spoke “${text}”`)
  u.onerror = (e) => onStatus?.(`blocked (${e.error})`)
  // A paused queue (seen on iOS after interruptions) would swallow the cue.
  synth.resume()
  synth.speak(u)
}

export function cancelSpeech(): void {
  if (supported()) window.speechSynthesis.cancel()
}
