/** Speaks a short phrase. Not sample-accurate, so it complements (never replaces) the tone cue. */
export function speak(text: string, volume = 1): void {
  if (!text || !('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(text)
  u.volume = volume
  u.rate = 1.15
  window.speechSynthesis.speak(u)
}

export function cancelSpeech(): void {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}
