<script lang="ts">
import { decodePreset, shareUrl } from '../lib/model/codec'
import type { Preset } from '../lib/model/preset'
import {
  app,
  duplicatePreset,
  editPreset,
  newPreset,
  removePreset,
  savePreset,
  setActive,
} from '../lib/state.svelte'

let importText = $state('')
let message = $state('')

async function share(p: Preset) {
  const url = shareUrl($state.snapshot(p) as Preset)
  try {
    if (navigator.share) await navigator.share({ title: p.name, url })
    else {
      await navigator.clipboard.writeText(url)
      message = 'Link copied.'
    }
  } catch {
    message = url
  }
}

function importPreset() {
  const raw = importText.trim()
  const code = raw.includes('#p=') ? raw.split('#p=')[1] : raw
  const p = decodePreset(code)
  if (!p) {
    message = 'That is not a valid preset link or code.'
    return
  }
  setActive(savePreset(p, null))
  importText = ''
  message = `Imported “${p.name}”.`
}
</script>

<div class="screen">
  <h1>Presets</h1>
  {#each app.presets as p (p.name)}
    <div class="card">
      <div class="row">
        <strong class="grow">{p.name}</strong>
        {#if p.name === app.activeName}<span class="chip green">Active</span>{/if}
      </div>
      <div class="muted">{p.phases.length} phases · {p.cycleSec}s cycle</div>
      <div class="row">
        <button type="button" onclick={() => { setActive(p.name); app.view = 'timer' }}>Use</button>
        <button type="button" onclick={() => editPreset(p.name)}>Edit</button>
        <button type="button" onclick={() => duplicatePreset(p.name)}>Duplicate</button>
        <button type="button" onclick={() => share(p)}>Share</button>
        {#if app.presets.length > 1}
          <button type="button" class="danger" onclick={() => removePreset(p.name)}>Delete</button>
        {/if}
      </div>
    </div>
  {/each}
  <button type="button" class="primary" onclick={newPreset}>New preset</button>
  <div class="card">
    <strong>Import</strong>
    <textarea placeholder="Paste a share link or code" bind:value={importText}></textarea>
    <button type="button" onclick={importPreset} disabled={!importText.trim()}>Import</button>
  </div>
  {#if message}<div class="muted" style="word-break:break-all">{message}</div>{/if}
  <div class="muted">Presets live only on this device. Share links carry the whole preset in the URL fragment, so nothing is sent to a server.</div>
</div>
