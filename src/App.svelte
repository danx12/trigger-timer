<script lang="ts">
import { presetFromHash } from './lib/model/codec'
import { app, savePreset, setActive } from './lib/state.svelte'
import Calibrate from './screens/Calibrate.svelte'
import Editor from './screens/Editor.svelte'
import History from './screens/History.svelte'
import Presets from './screens/Presets.svelte'
import Timer from './screens/Timer.svelte'

const tabs = [
  ['timer', 'Timer', '⏱'],
  ['presets', 'Presets', '☰'],
  ['calibrate', 'Detect', '🎙'],
  ['history', 'History', '📊'],
] as const

function readHash() {
  const p = presetFromHash(location.hash)
  if (p) {
    app.pendingImport = p
    history.replaceState(null, '', location.pathname + location.search)
  }
}
readHash()
addEventListener('hashchange', readHash)

function acceptImport() {
  if (!app.pendingImport) return
  setActive(savePreset(app.pendingImport, null))
  app.pendingImport = null
  app.view = 'timer'
}
</script>

{#if app.pendingImport}
  <div class="screen">
    <div class="banner">
      <strong>Import preset “{app.pendingImport.name}”?</strong>
      <span class="muted">
        {app.pendingImport.phases.length} phases, {app.pendingImport.cycleSec}s cycle — received through a share link.
      </span>
      <div class="row">
        <button type="button" class="primary" onclick={acceptImport}>Import &amp; use</button>
        <button type="button" onclick={() => (app.pendingImport = null)}>Dismiss</button>
      </div>
    </div>
  </div>
{/if}

<!-- Timer stays mounted so a running session survives tab switches. -->
<div hidden={app.view !== 'timer'}><Timer /></div>
{#if app.view === 'presets'}<Presets />{/if}
{#if app.view === 'editor'}<Editor />{/if}
{#if app.view === 'calibrate'}<Calibrate />{/if}
{#if app.view === 'history'}<History />{/if}

<nav class="tabs">
  {#each tabs as [id, label, icon]}
    <button type="button"
      class:active={app.view === id || (id === 'presets' && app.view === 'editor')}
      onclick={() => (app.view = id)}
    >
      <span aria-hidden="true">{icon}</span>{label}
    </button>
  {/each}
</nav>
