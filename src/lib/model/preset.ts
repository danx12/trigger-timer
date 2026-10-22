export type Wave = 'sine' | 'triangle' | 'square' | 'sawtooth'

export interface Cue {
  freq: number
  wave: Wave
  durMs: number
  repeats: number
  gapMs: number
  volume: number
}

export interface Phase {
  id: string
  label: string
  instructions: string
  startSec: number
  color: string
  cue: Cue
  speak: string
}

export interface Roles {
  aim: string
  green: string
  abort: string
}

export interface Preset {
  v: 1
  name: string
  cycleSec: number
  phases: Phase[]
  roles: Roles
}

export const WAVES: Wave[] = ['sine', 'triangle', 'square', 'sawtooth']

/**
 * Phases are told apart by pitch alone: one soft tone each, rising through the hold. The low abort tone is a triangle
 * so its overtones carry on phone speakers, which barely reproduce a pure sine below ~250 Hz.
 */
export const CUE_PRESETS: Record<string, Cue> = {
  Low: { freq: 262, wave: 'triangle', durMs: 450, repeats: 1, gapMs: 0, volume: 0.45 },
  Mid: { freq: 440, wave: 'sine', durMs: 250, repeats: 1, gapMs: 0, volume: 0.3 },
  'Mid-high': { freq: 523, wave: 'sine', durMs: 250, repeats: 1, gapMs: 0, volume: 0.3 },
  High: { freq: 659, wave: 'sine', durMs: 250, repeats: 1, gapMs: 0, volume: 0.3 },
}

export const DEFAULT_PRESET: Preset = {
  v: 1,
  name: 'Standard 14 s hold',
  cycleSec: 35,
  roles: { aim: 'aim', green: 'green', abort: 'abort' },
  phases: [
    {
      id: 'mount',
      label: 'Mount & Load',
      instructions:
        'Rifle in shoulder pocket, head on the cheekpiece, take two full natural breaths.',
      startSec: 0,
      color: '#2563eb',
      cue: CUE_PRESETS.Mid,
      speak: 'mount',
    },
    {
      id: 'aim',
      label: 'Aiming Area',
      instructions:
        'Exhale to natural respiratory pause; lower the front globe through the target into your aiming area.',
      startSec: 8,
      color: '#d97706',
      cue: CUE_PRESETS['Mid-high'],
      speak: 'aim',
    },
    {
      id: 'green',
      label: 'Green Light',
      instructions:
        'Peak stability. The trigger squeeze should already be moving through the second stage.',
      startSec: 11,
      color: '#16a34a',
      cue: CUE_PRESETS.High,
      speak: 'green',
    },
    {
      id: 'abort',
      label: 'Abort · Rest & Reset',
      instructions:
        'If the shot has not broken, open the trigger finger and lower the rifle. Rest on the stand, breathe, reset.',
      startSec: 14,
      color: '#dc2626',
      cue: CUE_PRESETS.Low,
      speak: 'abort',
    },
  ],
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null
const num = (x: unknown, min: number, max: number) =>
  typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max
const str = (x: unknown, max: number) => typeof x === 'string' && x.length <= max

function validCue(c: unknown): c is Cue {
  return (
    isObj(c) &&
    num(c.freq, 50, 12000) &&
    typeof c.wave === 'string' &&
    (WAVES as string[]).includes(c.wave) &&
    num(c.durMs, 10, 3000) &&
    num(c.repeats, 1, 8) &&
    num(c.gapMs, 0, 2000) &&
    num(c.volume, 0, 1)
  )
}

function validPhase(p: unknown): p is Phase {
  return (
    isObj(p) &&
    str(p.id, 32) &&
    (p.id as string).length > 0 &&
    str(p.label, 60) &&
    str(p.instructions, 300) &&
    num(p.startSec, 0, 600) &&
    typeof p.color === 'string' &&
    /^#[0-9a-fA-F]{6}$/.test(p.color) &&
    validCue(p.cue) &&
    str(p.speak, 40)
  )
}

/** Returns a sanitized Preset or null when the value is not a valid v1 preset. */
export function validatePreset(x: unknown): Preset | null {
  if (!isObj(x) || x.v !== 1 || !str(x.name, 60) || !num(x.cycleSec, 5, 600)) return null
  if (!Array.isArray(x.phases) || x.phases.length < 1 || x.phases.length > 12) return null
  if (!x.phases.every(validPhase)) return null
  const phases = x.phases as Phase[]
  const ids = new Set(phases.map((p) => p.id))
  if (ids.size !== phases.length) return null
  if (phases.some((p) => p.startSec >= (x.cycleSec as number))) return null
  const r = x.roles
  if (!isObj(r) || ![r.aim, r.green, r.abort].every((id) => typeof id === 'string' && ids.has(id)))
    return null
  const sorted = [...phases].sort((a, b) => a.startSec - b.startSec)
  return {
    v: 1,
    name: x.name as string,
    cycleSec: x.cycleSec as number,
    phases: sorted,
    roles: { aim: r.aim as string, green: r.green as string, abort: r.abort as string },
  }
}

export function clonePreset(p: Preset): Preset {
  // JSON round-trip also copes with Svelte $state proxies, which structuredClone rejects.
  return JSON.parse(JSON.stringify(p))
}
