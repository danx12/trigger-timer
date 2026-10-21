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
  }
  return { ctx, master: master as GainNode }
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
