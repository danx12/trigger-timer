<script lang="ts">
import { getAudio, unlockAudio } from '../lib/audio/context'
import { playCue } from '../lib/audio/cues'
import { clipFor } from '../lib/audio/voice'
import { CUE_PRESETS, type Phase, type Preset, validatePreset, WAVES } from '../lib/model/preset'
import { app, savePreset } from '../lib/state.svelte'

// The draft was created by editPreset()/newPreset(); keep a local reactive copy.
let draft = $state(app.editingDraft as Preset)
let error = $state('')

async function preview(phase: Phase) {
  const ctx = await unlockAudio()
  playCue(ctx, getAudio().master, $state.snapshot(phase.cue), ctx.currentTime + 0.05)
}

function addPhase() {
  const last = draft.phases.at(-1)
  draft.phases.push({
    id: `p${Date.now().toString(36)}`,
    label: 'New phase',
    instructions: '',
    startSec: Math.min(draft.cycleSec - 1, (last?.startSec ?? 0) + 1),
    color: '#7c3aed',
    cue: { ...CUE_PRESETS.Ding },
    speak: '',
  })
}

function removePhase(id: string) {
  if (draft.phases.length <= 1) return
  draft.phases = draft.phases.filter((p) => p.id !== id)
  const ids = draft.phases.map((p) => p.id)
  for (const r of ['aim', 'green', 'abort'] as const) {
    if (!ids.includes(draft.roles[r])) draft.roles[r] = ids[0]
  }
}

function save() {
  const valid = validatePreset($state.snapshot(draft))
  if (!valid) {
    error =
      'Invalid preset: phase start times must be inside the cycle, and cue values within their limits.'
    return
  }
  savePreset(valid, app.editingName)
  app.view = 'presets'
}
</script>

<div class="screen">
  <h1>{app.editingName ? 'Edit preset' : 'New preset'}</h1>
  <div class="card">
    <label>Name <input bind:value={draft.name} maxlength="60" /></label>
    <label>
      Cycle length (s)
      <input type="number" min="5" max="600" step="0.5" bind:value={draft.cycleSec} />
    </label>
  </div>

  <div class="card">
    <strong>Hold-window roles</strong>
    <div class="muted">Used to score detected shots.</div>
    {#each ['aim', 'green', 'abort'] as const as role}
      <label>
        {role === 'aim' ? 'Start of hold (aim)' : role === 'green' ? 'Green window starts' : 'Hard abort'}
        <select bind:value={draft.roles[role]}>
          {#each draft.phases as p}<option value={p.id}>{p.label}</option>{/each}
        </select>
      </label>
    {/each}
  </div>

  {#each draft.phases as phase (phase.id)}
    <div class="card" style="border-left:4px solid {phase.color}">
      <div class="grid2">
        <label>Label <input bind:value={phase.label} maxlength="60" /></label>
        <label>Starts at (s) <input type="number" min="0" step="0.5" bind:value={phase.startSec} /></label>
      </div>
      <label>Instructions <textarea bind:value={phase.instructions} maxlength="300"></textarea></label>
      <div class="grid2">
        <label>
          Spoken cue
          <input bind:value={phase.speak} maxlength="40" />
          <span>{phase.speak && clipFor(phase.speak) ? 'built-in voice clip' : phase.speak ? 'system speech engine' : ''}</span>
        </label>
        <label>Colour <input type="color" bind:value={phase.color} /></label>
      </div>
      <strong>Tone</strong>
      <div class="row">
        <select
          class="grow"
          onchange={(e) => {
            const c = CUE_PRESETS[e.currentTarget.value]
            if (c) phase.cue = { ...c }
            e.currentTarget.value = ''
          }}
        >
          <option value="">Load a sound…</option>
          {#each Object.keys(CUE_PRESETS) as k}<option>{k}</option>{/each}
        </select>
        <button type="button" onclick={() => preview(phase)}>▶ Play</button>
      </div>
      <div class="grid2">
        <label>Pitch (Hz) <input type="number" min="50" max="12000" step="10" bind:value={phase.cue.freq} /></label>
        <label>
          Wave
          <select bind:value={phase.cue.wave}>{#each WAVES as w}<option>{w}</option>{/each}</select>
        </label>
        <label>Length (ms) <input type="number" min="10" max="3000" step="10" bind:value={phase.cue.durMs} /></label>
        <label>Repeats <input type="number" min="1" max="8" bind:value={phase.cue.repeats} /></label>
        <label>Gap (ms) <input type="number" min="0" max="2000" step="10" bind:value={phase.cue.gapMs} /></label>
        <label>Volume <input type="range" min="0" max="1" step="0.05" bind:value={phase.cue.volume} /></label>
      </div>
      {#if draft.phases.length > 1}
        <button type="button" class="danger" onclick={() => removePhase(phase.id)}>Remove phase</button>
      {/if}
    </div>
  {/each}

  <button type="button" onclick={addPhase}>Add phase</button>
  {#if error}<div class="error">{error}</div>{/if}
  <div class="row">
    <button type="button" class="primary grow" onclick={save}>Save</button>
    <button type="button" class="grow" onclick={() => (app.view = 'presets')}>Cancel</button>
  </div>
</div>
