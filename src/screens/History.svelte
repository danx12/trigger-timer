<script lang="ts">
import {
  deleteSession,
  downloadCsv,
  listSessions,
  type Session,
  sessionStats,
} from '../lib/session/history'

let sessions = $state<Session[]>(listSessions())
let open = $state<string | null>(null)

const fmt = (n: number | null, d = 2) => (n === null ? '–' : n.toFixed(d))

function remove(id: string) {
  deleteSession(id)
  sessions = listSessions()
}
</script>

<div class="screen">
  <h1>History</h1>
  {#if sessions.length === 0}
    <div class="muted">
      No sessions yet. Turn on shot detection, run the timer and your detected shots show up here.
    </div>
  {:else}
    <button type="button" onclick={() => downloadCsv(sessions)}>Export CSV</button>
  {/if}
  {#each sessions as s (s.id)}
    {@const st = sessionStats(s)}
    <div class="card">
      <div class="row">
        <strong class="grow">{new Date(s.startedAt).toLocaleString()}</strong>
        <button type="button" onclick={() => (open = open === s.id ? null : s.id)}>{open === s.id ? 'Hide' : 'Shots'}</button>
      </div>
      <div class="muted">{s.preset} · {s.cycles} cycles</div>
      <div class="grid2">
        <div>Shots: <strong>{st.shots}</strong></div>
        <div>Green: <strong>{st.greenPct}%</strong> ({st.green})</div>
        <div>Mean hold: <strong>{fmt(st.meanHold)} s</strong></div>
        <div>SD: <strong>{fmt(st.sdHold)} s</strong></div>
      </div>
      {#if open === s.id}
        {#each s.shots as sh}
          <div class="row">
            <span class="muted">#{sh.cycle + 1}</span>
            <span class="chip {sh.result}">{sh.result}</span>
            <span>{sh.hold.toFixed(2)} s</span>
          </div>
        {/each}
        <button type="button" class="danger" onclick={() => remove(s.id)}>Delete session</button>
      {/if}
    </div>
  {/each}
</div>
