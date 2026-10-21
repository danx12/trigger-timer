import { clonePreset, DEFAULT_PRESET, type Preset } from './model/preset'
import {
  loadActiveName,
  loadPresets,
  loadSettings,
  type Settings,
  saveActiveName,
  savePresets,
  saveSettings,
} from './storage'

export type View = 'timer' | 'presets' | 'editor' | 'calibrate' | 'history'

const presets = loadPresets()
const stored = loadActiveName()

export const app = $state({
  view: 'timer' as View,
  presets,
  activeName: presets.some((p) => p.name === stored) ? (stored as string) : presets[0].name,
  settings: loadSettings() as Settings,
  /** Name of the preset being edited; null when creating a new one. */
  editingName: null as string | null,
  editingDraft: null as Preset | null,
  /** A preset received through a share link, waiting for the user to accept it. */
  pendingImport: null as Preset | null,
})

export const activePreset = (): Preset =>
  app.presets.find((p) => p.name === app.activeName) ?? app.presets[0]

export function setActive(name: string): void {
  app.activeName = name
  saveActiveName(name)
}

export function updateSettings(patch: Partial<Settings>): void {
  Object.assign(app.settings, patch)
  saveSettings($state.snapshot(app.settings))
}

function uniqueName(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base} (${n})`)) n++
  return `${base} (${n})`
}

/** Saves `p`, replacing the preset called `replacing` (if any). Returns the stored name. */
export function savePreset(p: Preset, replacing: string | null): string {
  const taken = new Set(app.presets.filter((x) => x.name !== replacing).map((x) => x.name))
  const stored = { ...p, name: uniqueName(p.name.trim() || 'Untitled', taken) }
  const i = app.presets.findIndex((x) => x.name === replacing)
  if (i >= 0) app.presets[i] = stored
  else app.presets.push(stored)
  if (replacing && replacing === app.activeName) setActive(stored.name)
  savePresets($state.snapshot(app.presets))
  return stored.name
}

export function removePreset(name: string): void {
  if (app.presets.length <= 1) return
  app.presets = app.presets.filter((p) => p.name !== name)
  if (app.activeName === name) setActive(app.presets[0].name)
  savePresets($state.snapshot(app.presets))
}

export function duplicatePreset(name: string): void {
  const src = app.presets.find((p) => p.name === name)
  if (src) savePreset({ ...clonePreset(src), name: `${src.name} copy` }, null)
}

export function newPreset(): void {
  app.editingName = null
  app.editingDraft = { ...clonePreset(DEFAULT_PRESET), name: 'New preset' }
  app.view = 'editor'
}

export function editPreset(name: string): void {
  const p = app.presets.find((x) => x.name === name)
  if (!p) return
  app.editingName = name
  app.editingDraft = clonePreset($state.snapshot(p) as Preset)
  app.view = 'editor'
}
