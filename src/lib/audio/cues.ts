import type { Cue } from '../model/preset'

/** Total duration of a cue in seconds. */
export function cueLength(cue: Cue): number {
  return (cue.repeats * cue.durMs + (cue.repeats - 1) * cue.gapMs) / 1000
}

const CURVE_POINTS = 64
/** Firefox throws if an automation event falls inside a value curve, so events after one sit just past it. */
const EPS = 0.0005

/** Half-cosine fade between two gain values; no corners, so no audible clicks. */
function fadeCurve(from: number, to: number): Float32Array {
  const c = new Float32Array(CURVE_POINTS)
  for (let i = 0; i < CURVE_POINTS; i++) {
    const k = 0.5 - 0.5 * Math.cos((Math.PI * i) / (CURVE_POINTS - 1))
    c[i] = from + (to - from) * k
  }
  return c
}

/** Schedules a synthesized cue on `dest` starting at ctx time `when`; returns its end time. */
export function playCue(ctx: BaseAudioContext, dest: AudioNode, cue: Cue, when: number): number {
  const dur = cue.durMs / 1000
  const attack = Math.min(0.012, dur * 0.3)
  const release = Math.min(0.03, dur * 0.4 - EPS)
  for (let i = 0; i < cue.repeats; i++) {
    const t = when + i * (dur + cue.gapMs / 1000)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = cue.wave
    osc.frequency.value = cue.freq
    // Start and end at exactly 0 with smooth fades, held at full level in between.
    gain.gain.setValueAtTime(0, t)
    gain.gain.setValueCurveAtTime(fadeCurve(0, cue.volume), t, attack)
    gain.gain.setValueAtTime(cue.volume, t + attack + EPS)
    gain.gain.setValueCurveAtTime(fadeCurve(cue.volume, 0), t + dur - release, release)
    gain.gain.setValueAtTime(0, t + dur + EPS)
    osc.connect(gain).connect(dest)
    osc.start(t)
    osc.stop(t + dur + 0.05)
  }
  return when + cueLength(cue)
}
