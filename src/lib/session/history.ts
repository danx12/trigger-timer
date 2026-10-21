import { loadSessions, saveSessions } from '../storage'
import type { Shot } from './classify'

export interface Session {
  id: string
  startedAt: number
  preset: string
  cycles: number
  shots: Shot[]
}

export const listSessions = (): Session[] => loadSessions<Session>()

export function saveSession(s: Session): void {
  const all = listSessions().filter((x) => x.id !== s.id)
  all.unshift(s)
  saveSessions(all.slice(0, 200))
}

export function deleteSession(id: string): void {
  saveSessions(listSessions().filter((x) => x.id !== id))
}

export interface Stats {
  shots: number
  green: number
  greenPct: number
  meanHold: number | null
  sdHold: number | null
}

export function sessionStats(s: Session): Stats {
  const shots = s.shots.filter((x) => x.result !== 'rest' && x.result !== 'before-aim')
  const holds = shots.map((x) => x.hold)
  const mean = holds.length ? holds.reduce((a, b) => a + b, 0) / holds.length : null
  const sd =
    mean !== null && holds.length > 1
      ? Math.sqrt(holds.reduce((a, b) => a + (b - mean) ** 2, 0) / (holds.length - 1))
      : null
  const green = shots.filter((x) => x.result === 'green').length
  return {
    shots: shots.length,
    green,
    greenPct: shots.length ? Math.round((green / shots.length) * 100) : 0,
    meanHold: mean,
    sdHold: sd,
  }
}

export function sessionsToCsv(sessions: Session[]): string {
  const rows = ['session,started,preset,cycle,t_in_cycle_s,hold_s,result']
  for (const s of sessions) {
    for (const sh of s.shots) {
      rows.push(
        [
          s.id,
          new Date(s.startedAt).toISOString(),
          `"${s.preset.replace(/"/g, '""')}"`,
          sh.cycle + 1,
          sh.tInCycle.toFixed(3),
          sh.hold.toFixed(3),
          sh.result,
        ].join(','),
      )
    }
  }
  return rows.join('\n')
}

export function downloadCsv(sessions: Session[]): void {
  const blob = new Blob([sessionsToCsv(sessions)], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'trigger-timer-history.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}
