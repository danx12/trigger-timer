import { clonePreset, DEFAULT_PRESET, type Preset, validatePreset } from './model/preset'

const KEYS = {
  presets: 'tt.presets.v1',
  active: 'tt.active.v1',
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
  speak: boolean
  mediaKeys: boolean
  masterVolume: number
}

export const DEFAULT_SETTINGS: Settings = {
  detect: false,
  threshold: null,
  noiseFloor: null,
  speak: false,
  mediaKeys: false,
  masterVolume: 1,
}

export function loadPresets(): Preset[] {
  const raw = read<unknown[]>(KEYS.presets)
  const list = Array.isArray(raw)
    ? raw.map(validatePreset).filter((p): p is Preset => p !== null)
    : []
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
