<script lang="ts">
import { onDestroy } from 'svelte'
import { setAudioSession, unlockAudio } from '../lib/audio/context'
import { ClickDetector } from '../lib/detect/detector'
import { app, updateSettings } from '../lib/state.svelte'

type Step = 'idle' | 'noise' | 'fire' | 'test'
const NOISE_SECONDS = 3
const SHOTS_NEEDED = 5

let step = $state<Step>('idle')
let level = $state(0)
let noisePeak = $state(0)
let peaks = $state<number[]>([])
let testHits = $state(0)
let flash = $state(false)
let error = $state('')
let countdown = $state(NOISE_SECONDS)
let detector: ClickDetector | null = null

const pct = (v: number) => Math.max(0, Math.min(100, ((Math.log10(Math.max(v, 1e-4)) + 4) / 4) * 100))

function blink() {
  flash = true
  setTimeout(() => (flash = false), 150)
}

async function begin() {
  error = ''
  peaks = []
  noisePeak = 0
  testHits = 0
  try {
    const ctx = await unlockAudio()
    detector = new ClickDetector(ctx, {
      onLevel: (l) => {
        level = l
        if (step === 'noise') noisePeak = Math.max(noisePeak, l)
      },
      onShot: (_t, peak) => {
        blink()
        if (step === 'fire') {
          peaks.push(peak)
          if (peaks.length >= SHOTS_NEEDED) finishFire()
        } else if (step === 'test') testHits++
      },
    })
    // Deliberately sensitive while calibrating; the final threshold is derived from the results.
    await detector.start({ threshold: 0.002 })
    step = 'noise'
    countdown = NOISE_SECONDS
    const t = setInterval(() => {
      countdown--
      if (countdown <= 0) {
        clearInterval(t)
        detector?.setOptions({ threshold: Math.max(noisePeak * 1.5, 0.004) })
        step = 'fire'
      }
    }, 1000)
  } catch (e) {
    error = `Microphone unavailable: ${(e as Error).message}`
    detector?.stop()
    detector = null
  }
}

function finishFire() {
  const weakest = Math.min(...peaks)
  // Geometric mean sits between the noise and the weakest click, with margin on both sides.
  const threshold = Math.max(Math.sqrt(Math.max(noisePeak, 1e-4) * weakest), noisePeak * 1.2)
  updateSettings({ threshold, noiseFloor: noisePeak })
  detector?.setOptions({ threshold })
  step = 'test'
}

function stop() {
  detector?.stop()
  detector = null
  step = 'idle'
  level = 0
  setAudioSession('playback')
}

onDestroy(stop)
</script>

<div class="screen">
  <h1>Dry-fire detection</h1>
  <div class="card">
    <div class="muted">
      Listens for the trigger click with the microphone and scores each shot against your hold window.
      Place the phone near the rifle, then calibrate. Everything stays on this device.
    </div>
    <div style="height:14px;background:#000;border-radius:7px;overflow:hidden;position:relative">
      <div style="height:100%;width:{pct(level)}%;background:{flash ? 'var(--ok)' : 'var(--accent)'}"></div>
      {#if app.settings.threshold}
        <div style="position:absolute;top:0;bottom:0;left:{pct(app.settings.threshold)}%;width:2px;background:var(--warn)"></div>
      {/if}
    </div>
    <div class="muted">
      Level meter (log scale){app.settings.threshold ? ' — orange line is the click threshold' : ''}
    </div>
  </div>

  {#if step === 'idle'}
    <button type="button" class="primary" onclick={begin}>{app.settings.threshold ? 'Recalibrate' : 'Start calibration'}</button>
  {:else if step === 'noise'}
    <div class="card"><strong>1/3 · Stay quiet</strong> Measuring background noise… {countdown}s</div>
  {:else if step === 'fire'}
    <div class="card">
      <strong>2/3 · Dry-fire {SHOTS_NEEDED} times</strong>
      <div>{peaks.length} / {SHOTS_NEEDED} clicks heard</div>
    </div>
  {:else}
    <div class="card">
      <strong>3/3 · Test it</strong>
      <div>Threshold saved. Dry-fire a few more times: {testHits} detected.</div>
      <div class="muted">Too many false hits? Recalibrate in a quieter spot.</div>
    </div>
    <button type="button" class="primary" onclick={stop}>Done</button>
  {/if}
  {#if step !== 'idle' && step !== 'test'}<button type="button" onclick={stop}>Cancel</button>{/if}
  {#if error}<div class="error">{error}</div>{/if}

  <div class="card">
    <label class="row">
      <input
        type="checkbox"
        style="width:auto;min-height:0"
        checked={app.settings.detect}
        onchange={(e) => updateSettings({ detect: e.currentTarget.checked })}
      />
      Use detection when the timer runs
    </label>
    {#if app.settings.threshold}
      <div class="muted">
        Saved threshold {app.settings.threshold.toFixed(4)} (noise peak {app.settings.noiseFloor?.toFixed(4)}).
      </div>
    {/if}
  </div>
</div>
