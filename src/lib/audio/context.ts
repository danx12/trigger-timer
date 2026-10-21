type AudioSessionType = 'auto' | 'playback' | 'play-and-record' | 'transient' | 'ambient'

let ctx: AudioContext | null = null
let master: GainNode | null = null

export function getAudio(): { ctx: AudioContext; master: GainNode } {
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctor({ latencyHint: 'interactive' })
    master = ctx.createGain()
    master.connect(ctx.destination)
    startKeepAlive(ctx)
  }
  return { ctx, master: master as GainNode }
}

/**
 * Plays a constant, inaudible noise floor (about -72 dBFS). Browsers (notably Firefox and Safari) let the
 * output device idle when nothing is playing, and waking it for the next cue produces a pop.
 */
function startKeepAlive(ctx: AudioContext): void {
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.00025
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.loop = true
  src.connect(ctx.destination)
  src.start()
}

/** Must be called from a user gesture (tap) to satisfy Safari's autoplay policy. */
export async function unlockAudio(): Promise<AudioContext> {
  const { ctx } = getAudio()
  if (ctx.state !== 'running') await ctx.resume()
  return ctx
}

/** iOS 17+: 'playback' ignores the mute switch; 'play-and-record' is needed while the mic is open. */
export function setAudioSession(type: AudioSessionType): void {
  const nav = navigator as Navigator & { audioSession?: { type: AudioSessionType } }
  try {
    if (nav.audioSession) nav.audioSession.type = type
  } catch {
    // unsupported
  }
}

export function setMasterVolume(v: number): void {
  const { master, ctx } = getAudio()
  master.gain.setTargetAtTime(v, ctx.currentTime, 0.01)
}

let wakeLock: WakeLockSentinel | null = null

export async function holdScreenAwake(): Promise<void> {
  try {
    wakeLock = (await navigator.wakeLock?.request('screen')) ?? null
  } catch {
    wakeLock = null
  }
}

export async function releaseScreen(): Promise<void> {
  try {
    await wakeLock?.release()
  } finally {
    wakeLock = null
  }
}
