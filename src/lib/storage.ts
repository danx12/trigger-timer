import { defaultLang, type Lang } from './audio/voice'
import {
  BUILTIN_PRESETS,
  clonePreset,
  DEFAULT_PRESET,
  type Preset,
  validatePreset,
} from './model/preset'

const KEYS = {
  presets: 'tt.presets.v1',
  active: 'tt.active.v1',
  seeded: 'tt.builtins.v1',
  settings: 'tt.settings.v1',
  sessions: 'tt.sessions.v1',
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable (private mode / quota): the app still works for this visit
  }
}

export interface Settings {
  detect: boolean
  threshold: number | null
  noiseFloor: number | null
  /** Play a tone for each phase. */
  tones: boolean
  /** Play a spoken clip for each phase. */
  speak: boolean
  voiceLang: Lang
  masterVolume: number
}

export const DEFAULT_SETTINGS: Settings = {
  detect: false,
  threshold: null,
  noiseFloor: null,
  tones: true,
  speak: false,
  voiceLang: defaultLang(),
  masterVolume: 1,
}

/**
 * The saved presets plus any built-in preset this device has not been given yet. Each built-in is added once (by
 * name, unless a preset of that name exists), so presets the user deleted stay deleted. A device that predates this
 * list already had the default preset.
 */
export function loadPresets(): Preset[] {
  const raw = read<unknown[]>(KEYS.presets)
  const list = Array.isArray(raw)
    ? raw.map(validatePreset).filter((p): p is Preset => p !== null)
    : []
  const seeded = new Set(read<string[]>(KEYS.seeded) ?? (list.length ? [DEFAULT_PRESET.name] : []))
  const added = BUILTIN_PRESETS.filter((b) => !seeded.has(b.name))
  for (const b of added) {
    seeded.add(b.name)
    if (!list.some((p) => p.name === b.name)) list.push(clonePreset(b))
  }
  if (added.length) {
    write(KEYS.seeded, [...seeded])
    savePresets(list)
  }
  return list.length ? list : [clonePreset(DEFAULT_PRESET)]
}

export const savePresets = (list: Preset[]) => write(KEYS.presets, list)

export const loadActiveName = (): string | null => read<string>(KEYS.active)
export const saveActiveName = (name: string) => write(KEYS.active, name)

export const loadSettings = (): Settings => ({
  ...DEFAULT_SETTINGS,
  ...(read<Partial<Settings>>(KEYS.settings) ?? {}),
})
export const saveSettings = (s: Settings) => write(KEYS.settings, s)

export const loadSessions = <T>(): T[] => read<T[]>(KEYS.sessions) ?? []
export const saveSessions = (s: unknown[]) => write(KEYS.sessions, s)
