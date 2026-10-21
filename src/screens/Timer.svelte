<script lang="ts">
import { onDestroy } from 'svelte'
import {
  getAudio,
  holdScreenAwake,
  releaseScreen,
  setAudioSession,
  setMasterVolume,
  unlockAudio,
} from '../lib/audio/context'
import { phaseAt, Scheduler } from '../lib/audio/scheduler'
import { cancelSpeech, speak } from '../lib/audio/speech'
import { ClickDetector } from '../lib/detect/detector'
import { classifyShot, type Shot } from '../lib/session/classify'
import { saveSession } from '../lib/session/history'
import { activePreset, app, updateSettings } from '../lib/state.svelte'

const preset = $derived(activePreset())

let running = $state(false)
let error = $state('')
let elapsed = $state(-1)
let shots = $state<Shot[]>([])
let sessionId = ''
let startedAt = 0
let scheduler: Scheduler | null = null
let detector: ClickDetector | null = null
let raf = 0

const pos = $derived(elapsed >= 0 ? phaseAt(preset, elapsed) : null)
const lastShot = $derived(shots.at(-1))
const RESULT_TEXT: Record<string, string> = {
  green: 'In the green window',
  early: 'Early — before green',
  late: 'Late — after abort',
  'before-aim': 'Before aim',
  rest: 'During rest',
}

function frame() {
  if (!scheduler) return
  elapsed = scheduler.elapsed()
  raf = requestAnimationFrame(frame)
}

async function start() {
  error = ''
  try {
    const ctx = await unlockAudio()
    const { master } = getAudio()
    setMasterVolume(app.settings.masterVolume)
    setAudioSession(app.settings.detect ? 'play-and-record' : 'playback')
    scheduler = new Scheduler(ctx, master, () => preset)
    scheduler.onCue = (e) => {
      if (!app.settings.speak) return
      const delay = Math.max(0, (e.time - ctx.currentTime) * 1000)
      setTimeout(() => running && speak(e.phase.speak, app.settings.masterVolume), delay)
    }
    shots = []
    sessionId = crypto.randomUUID()
    startedAt = Date.now()
    if (app.settings.detect) {
      const det = new ClickDetector(ctx, {
        onShot: (t) => {
          if (!scheduler) return
          const e = t - scheduler.t0
          if (e < 0) return
          const p = phaseAt(preset, e)
          shots.push(classifyShot(preset, p.cycle, p.tInCycle))
        },
      })
      det.gate = (t) => scheduler?.inCueWindow(t) ?? false
      try {
        await det.start({ threshold: app.settings.threshold ?? 0.05 })
        detector = det
      } catch (e) {
        error = `Shot detection unavailable: ${(e as Error).message}. Timer runs without it.`
        det.stop()
      }
    }
    scheduler.start()
    running = true
    void holdScreenAwake()
    raf = requestAnimationFrame(frame)
  } catch (e) {
    error = (e as Error).message
  }
}

function stop() {
  running = false
  cancelAnimationFrame(raf)
  const cycles = pos ? pos.cycle + 1 : 0
  scheduler?.stop()
  scheduler = null
  detector?.stop()
  detector = null
  cancelSpeech()
  void releaseScreen()
  if (app.settings.detect && cycles > 0) {
    saveSession({
      id: sessionId,
      startedAt,
      preset: preset.name,
      cycles,
      shots: $state.snapshot(shots),
    })
  }
  elapsed = -1
}

function onVisible() {
  if (running && document.visibilityState === 'visible') void holdScreenAwake()
}
document.addEventListener('visibilitychange', onVisible)
onDestroy(() => {
  document.removeEventListener('visibilitychange', onVisible)
  if (running) stop()
})

$effect(() => {
  document.body.style.background = running ? bg : ''
  return () => {
    document.body.style.background = ''
  }
})

const bg = $derived(pos ? `color-mix(in srgb, ${pos.phase.color} 35%, #0b0f14)` : '')
</script>

<div class="screen">
  {#if !running}
    <h1>Trigger Timer</h1>
    <div class="card">
      <label>
        Preset
        <select
          value={app.activeName}
          onchange={(e) => (app.activeName = e.currentTarget.value)}
        >
          {#each app.presets as p}<option>{p.name}</option>{/each}
        </select>
      </label>
      <div class="muted">
        {preset.phases.map((p) => `${p.startSec}s ${p.label}`).join(' · ')} · loops every {preset.cycleSec}s
      </div>
    </div>
    <div class="card">
      <label class="row">
        <input
          type="checkbox"
          style="width:auto;min-height:0"
          checked={app.settings.speak}
          onchange={(e) => updateSettings({ speak: e.currentTarget.checked })}
        />
        Speak phase names
      </label>
      <label class="row">
        <input
          type="checkbox"
          style="width:auto;min-height:0"
          checked={app.settings.detect}
          onchange={(e) => updateSettings({ detect: e.currentTarget.checked })}
        />
        Detect dry-fire click with the microphone
      </label>
      {#if app.settings.detect && app.settings.threshold === null}
        <div class="muted">Not calibrated yet — use the Detect tab first for reliable results.</div>
      {/if}
      <label>
        Volume
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          value={app.settings.masterVolume}
          oninput={(e) => updateSettings({ masterVolume: Number(e.currentTarget.value) })}
        />
      </label>
    </div>
    {#if error}<div class="error">{error}</div>{/if}
    <button type="button" class="primary" style="min-height:64px;font-size:1.2rem" onclick={start}>Start</button>
  {:else}
    <div class="row">
      <span class="chip">{preset.name}</span>
      <span class="chip">Cycle {pos ? pos.cycle + 1 : 1}</span>
      {#if app.settings.detect}<span class="chip">{shots.length} shots</span>{/if}
    </div>
    {#if error}<div class="error">{error}</div>{/if}
    {#if pos}
      <div style="text-align:center;padding:1.5rem 0">
        <div class="muted">{pos.phase.label}</div>
        <div style="font-size:7rem;font-weight:700;line-height:1;font-variant-numeric:tabular-nums">
          {Math.ceil(pos.remaining)}
        </div>
        <p>{pos.phase.instructions}</p>
      </div>
      <div style="display:flex;height:14px;border-radius:7px;overflow:hidden;background:#000">
        {#each preset.phases as ph, i}
          {@const end = preset.phases[i + 1]?.startSec ?? preset.cycleSec}
          <div style="flex:{end - ph.startSec};background:{ph.color};opacity:{ph.id === pos.phase.id ? 1 : 0.35}"></div>
        {/each}
      </div>
      <div style="position:relative;height:6px;margin-top:-0.6rem">
        <div
          style="position:absolute;left:{(pos.tInCycle / preset.cycleSec) * 100}%;width:3px;height:14px;background:#fff;top:-14px"
        ></div>
      </div>
    {:else}
      <div style="text-align:center;font-size:2rem;padding:3rem 0">Get ready…</div>
    {/if}
    {#if lastShot}
      <div class="card">
        <div class="row">
          <span class="chip {lastShot.result}">{RESULT_TEXT[lastShot.result]}</span>
          <span>hold {lastShot.hold.toFixed(2)} s</span>
        </div>
      </div>
    {/if}
    <button type="button" class="danger" style="min-height:56px" onclick={stop}>Stop</button>
  {/if}
</div>
