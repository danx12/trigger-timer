import type { Phase, Preset } from '../model/preset'
import { cueLength, playCue } from './cues'

export interface PhasePosition {
  cycle: number
  phase: Phase
  /** Seconds since the start of the current cycle. */
  tInCycle: number
  /** Seconds since the current phase began. */
  tInPhase: number
  /** Seconds until the next phase (or the next cycle). */
  remaining: number
}

/** Pure lookup of where the timer is, given elapsed seconds since the start of cycle 0. */
export function phaseAt(preset: Preset, elapsed: number): PhasePosition {
  const e = Math.max(0, elapsed)
  const cycle = Math.floor(e / preset.cycleSec)
  const tInCycle = e - cycle * preset.cycleSec
  let idx = 0
  for (let i = 0; i < preset.phases.length; i++) {
    if (preset.phases[i].startSec <= tInCycle) idx = i
  }
  const phase = preset.phases[idx]
  const next = preset.phases[idx + 1]?.startSec ?? preset.cycleSec
  return { cycle, phase, tInCycle, tInPhase: tInCycle - phase.startSec, remaining: next - tInCycle }
}

export interface CueEvent {
  /** AudioContext time in seconds. */
  time: number
  cycle: number
  phase: Phase
}

/** All cue events that start in [fromCycle, toCycle). */
export function planCycles(
  preset: Preset,
  t0: number,
  fromCycle: number,
  toCycle: number,
): CueEvent[] {
  const out: CueEvent[] = []
  for (let c = fromCycle; c < toCycle; c++) {
    for (const phase of preset.phases) {
      out.push({ time: t0 + c * preset.cycleSec + phase.startSec, cycle: c, phase })
    }
  }
  return out
}

export interface CueWindow {
  start: number
  end: number
}

const TICK_MS = 25
const HORIZON_S = 0.25
/** A cue this far behind the audio clock is skipped rather than played late. */
const STALE_S = 0.5
const RESUME_RETRY_MS = 250

/** Look-ahead scheduler: queues cue oscillators slightly ahead of the audio clock. */
export class Scheduler {
  t0 = 0
  /** performance.now() at which the cycle began; the wall-clock reference used to realign after an interruption. */
  private wall0 = 0
  private stalled = false
  private lastResume = 0
  private nextIndex = 0
  private timer: number | null = null
  private windows: CueWindow[] = []
  onCue?: (e: CueEvent) => void

  constructor(
    private ctx: AudioContext,
    private dest: AudioNode,
    private getPreset: () => Preset,
  ) {}

  start(t0 = this.ctx.currentTime + 0.1): void {
    this.stop()
    this.t0 = t0
    this.wall0 = performance.now() + (t0 - this.ctx.currentTime) * 1000
    this.stalled = false
    this.nextIndex = 0
    this.windows = []
    this.timer = window.setInterval(() => this.tick(), TICK_MS)
    this.tick()
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
  }

  get running(): boolean {
    return this.timer !== null
  }

  /** Seconds since the cycle began; follows the wall clock while the audio clock is stopped. */
  elapsed(): number {
    if (this.ctx.state !== 'running') return this.wallElapsed()
    return this.ctx.currentTime - this.t0
  }

  private wallElapsed(): number {
    return (performance.now() - this.wall0) / 1000
  }

  /** True if ctx time `t` falls inside (or just after) one of our own cues. */
  inCueWindow(t: number, tailSec = 0.12): boolean {
    return this.windows.some((w) => t >= w.start - 0.02 && t <= w.end + tailSec)
  }

  /**
   * iOS interrupts the audio context while speech plays, which freezes `currentTime`. Keep asking it to resume, and
   * once it does, move t0 so the timeline matches the wall clock again; cues missed meanwhile are skipped.
   */
  private watchInterruption(): boolean {
    if (this.ctx.state !== 'running') {
      this.stalled = true
      const now = performance.now()
      if (now - this.lastResume >= RESUME_RETRY_MS) {
        this.lastResume = now
        this.ctx.resume().catch(() => {})
      }
      return false
    }
    if (this.stalled) {
      this.stalled = false
      this.t0 = this.ctx.currentTime - this.wallElapsed()
      this.windows = []
    }
    return true
  }

  private tick(): void {
    if (!this.watchInterruption()) return
    const preset = this.getPreset()
    const perCycle = preset.phases.length
    const horizon = this.ctx.currentTime + HORIZON_S
    for (;;) {
      const cycle = Math.floor(this.nextIndex / perCycle)
      const phase = preset.phases[this.nextIndex % perCycle]
      const time = this.t0 + cycle * preset.cycleSec + phase.startSec
      if (time > horizon) break
      if (time < this.ctx.currentTime - STALE_S) {
        this.nextIndex++
        continue
      }
      const when = Math.max(time, this.ctx.currentTime)
      playCue(this.ctx, this.dest, phase.cue, when)
      this.windows.push({ start: when, end: when + cueLength(phase.cue) })
      if (this.windows.length > 64) this.windows.shift()
      this.onCue?.({ time, cycle, phase })
      this.nextIndex++
    }
  }
}
