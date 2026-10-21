import type { Phase, Preset } from '../model/preset'

export type ShotResult = 'rest' | 'before-aim' | 'early' | 'green' | 'late'

export interface Shot {
  cycle: number
  /** Seconds into the cycle. */
  tInCycle: number
  /** Seconds since the aim cue; negative if before it. */
  hold: number
  result: ShotResult
}

const startOf = (preset: Preset, id: string): number =>
  (preset.phases.find((p: Phase) => p.id === id) as Phase).startSec

/**
 * Scores a click against the hold window:
 *  before aim → `before-aim`; aim..green → `early`; green..abort → `green`;
 *  after the abort tone → `late` (or `rest` if it came during the long rest, i.e. not a shot attempt).
 */
export function classifyShot(preset: Preset, cycle: number, tInCycle: number): Shot {
  const aim = startOf(preset, preset.roles.aim)
  const green = startOf(preset, preset.roles.green)
  const abort = startOf(preset, preset.roles.abort)
  const hold = tInCycle - aim
  let result: ShotResult
  if (tInCycle < aim) result = 'before-aim'
  else if (tInCycle < green) result = 'early'
  else if (tInCycle < abort) result = 'green'
  else if (tInCycle < abort + 1.5) result = 'late'
  else result = 'rest'
  return { cycle, tInCycle, hold, result }
}
