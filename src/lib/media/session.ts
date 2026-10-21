/** A one-second, effectively silent 16-bit mono WAV (±1 LSB, about -90 dBFS) used to keep a media session alive. */
export function silentWav(): Uint8Array {
  const rate = 8000
  const n = rate
  const bytes = new Uint8Array(44 + n * 2)
  const v = new DataView(bytes.buffer)
  const tag = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i))
  }
  tag(0, 'RIFF')
  v.setUint32(4, 36 + n * 2, true)
  tag(8, 'WAVE')
  tag(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true) // PCM
  v.setUint16(22, 1, true) // mono
  v.setUint32(24, rate, true)
  v.setUint32(28, rate * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  tag(36, 'data')
  v.setUint32(40, n * 2, true)
  // Pure digital silence can be treated as "not playing"; ±1 LSB keeps the session active.
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, i % 2 ? 1 : -1, true)
  return bytes
}

export interface MediaControlsOptions {
  title: string
  artist: string
  /** Called for a play or pause press (they are treated as one toggle button). */
  onToggle: () => void
  /** Called for a stop press. */
  onStop: () => void
}

/**
 * Lets headset buttons (AirPods play/pause, lock-screen controls, keyboard media keys) drive the timer through the
 * Media Session API. Browsers only route those buttons to a page that is playing media, so an inaudible looping
 * audio element is played while armed.
 */
export class MediaControls {
  private audio: HTMLAudioElement | null = null
  private url: string | null = null

  static get supported(): boolean {
    return 'mediaSession' in navigator
  }

  get armed(): boolean {
    return this.audio !== null
  }

  /** Must be called from a user gesture so the audio element is allowed to play. */
  async arm(opts: MediaControlsOptions): Promise<void> {
    if (!MediaControls.supported) throw new Error('this browser has no media-button support')
    this.disarm()
    const url = URL.createObjectURL(new Blob([silentWav() as BlobPart], { type: 'audio/wav' }))
    const audio = new Audio(url)
    audio.loop = true
    try {
      await audio.play()
    } catch (e) {
      URL.revokeObjectURL(url)
      throw e
    }
    this.url = url
    this.audio = audio

    const session = navigator.mediaSession
    session.metadata = new MediaMetadata({
      title: opts.title,
      artist: opts.artist,
      album: 'Trigger Timer',
      artwork: [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }],
    })
    const toggle = () => {
      // The system may have paused our silent element in response to the press; keep it alive.
      void this.audio?.play().catch(() => {})
      opts.onToggle()
    }
    const set = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        session.setActionHandler(action, handler)
      } catch {
        // action not supported by this browser
      }
    }
    set('play', toggle)
    set('pause', toggle)
    set('stop', () => opts.onStop())
    session.playbackState = 'paused'
  }

  setRunning(running: boolean): void {
    if (this.audio && MediaControls.supported) {
      navigator.mediaSession.playbackState = running ? 'playing' : 'paused'
    }
  }

  setTitle(artist: string): void {
    const m = MediaControls.supported ? navigator.mediaSession.metadata : null
    if (m) m.artist = artist
  }

  disarm(): void {
    if (MediaControls.supported) {
      for (const a of ['play', 'pause', 'stop'] as MediaSessionAction[]) {
        try {
          navigator.mediaSession.setActionHandler(a, null)
        } catch {
          // ignore
        }
      }
      navigator.mediaSession.playbackState = 'none'
      navigator.mediaSession.metadata = null
    }
    this.audio?.pause()
    this.audio = null
    if (this.url) URL.revokeObjectURL(this.url)
    this.url = null
  }
}
