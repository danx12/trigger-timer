import type { Cue } from '../model/preset'

/** Total duration of a cue in seconds. */
export function cueLength(cue: Cue): number {
  return (cue.repeats * cue.durMs + (cue.repeats - 1) * cue.gapMs) / 1000
}

/** Schedules a synthesized cue on `dest` starting at ctx time `when`; returns its end time. */
export function playCue(ctx: BaseAudioContext, dest: AudioNode, cue: Cue, when: number): number {
  const dur = cue.durMs / 1000
  const attack = Math.min(0.008, dur / 4)
  for (let i = 0; i < cue.repeats; i++) {
    const t = when + i * (dur + cue.gapMs / 1000)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = cue.wave
    osc.frequency.setValueAtTime(cue.freq, t)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.linearRampToValueAtTime(cue.volume, t + attack)
    gain.gain.setValueAtTime(cue.volume, t + Math.max(attack, dur - 0.03))
    gain.gain.linearRampToValueAtTime(0.0001, t + dur)
    osc.connect(gain).connect(dest)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }
  return when + cueLength(cue)
}
