export interface OnsetOptions {
  /** Minimum fast-envelope amplitude (0..1, after high-pass) to count as a click. */
  threshold: number
  /** Fast envelope must exceed this multiple of the slow noise floor. */
  ratio?: number
  /** Ignore further onsets for this long after one is reported. */
  refractoryMs?: number
  /** A click must have decayed within this window; sustained sounds are rejected. */
  maxEventMs?: number
}

export interface Onset {
  /** Absolute frame index of the onset (same timeline as AudioContext.currentTime * sampleRate). */
  frame: number
  peak: number
}

const FAST_TC_S = 0.001
const SLOW_TC_S = 0.15

/** Streaming click detector working on (already high-passed) mono samples. */
export class OnsetDetector {
  private fast = 0
  private slow = 0
  private readonly aFast: number
  private readonly aSlow: number
  private candidate: { frame: number; peak: number; endFrame: number } | null = null
  private lastReportFrame = Number.NEGATIVE_INFINITY
  /** False after a rejected/reported event until the envelope has fallen back down. */
  private armed = true
  /** Highest fast-envelope value seen since the last `takeLevel()`. */
  private levelPeak = 0

  constructor(
    private readonly sampleRate: number,
    private opts: OnsetOptions,
  ) {
    this.aFast = 1 - Math.exp(-1 / (FAST_TC_S * sampleRate))
    this.aSlow = 1 - Math.exp(-1 / (SLOW_TC_S * sampleRate))
  }

  setOptions(opts: Partial<OnsetOptions>): void {
    this.opts = { ...this.opts, ...opts }
  }

  takeLevel(): number {
    const p = this.levelPeak
    this.levelPeak = 0
    return p
  }

  process(samples: ArrayLike<number>, frameOffset: number): Onset[] {
    const { threshold, ratio = 6, refractoryMs = 300, maxEventMs = 40 } = this.opts
    const refractory = (refractoryMs / 1000) * this.sampleRate
    const maxEvent = (maxEventMs / 1000) * this.sampleRate
    const out: Onset[] = []
    for (let i = 0; i < samples.length; i++) {
      const frame = frameOffset + i
      const x = Math.abs(samples[i])
      this.fast += this.aFast * (x - this.fast)
      if (this.fast > this.levelPeak) this.levelPeak = this.fast

      const c = this.candidate
      if (c) {
        if (this.fast > c.peak) c.peak = this.fast
        if (frame >= c.endFrame) {
          // A click has decayed by now; speech, tones and wind noise have not.
          if (this.fast < c.peak * 0.35) {
            out.push({ frame: c.frame, peak: c.peak })
            this.lastReportFrame = c.frame
          }
          this.candidate = null
          this.armed = false
        }
        continue
      }
      if (!this.armed) {
        if (this.fast < threshold * 0.5) this.armed = true
        else continue
      }

      if (
        this.fast > threshold &&
        this.fast > ratio * this.slow &&
        frame - this.lastReportFrame > refractory
      ) {
        this.candidate = { frame, peak: this.fast, endFrame: frame + maxEvent }
        continue
      }
      // The noise floor only adapts while no event is in progress.
      this.slow += this.aSlow * (this.fast - this.slow)
    }
    return out
  }
}
