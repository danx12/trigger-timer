import { setAudioSession } from '../audio/context'
import workletUrl from './click-detector.worklet.ts?worker&url'
import type { OnsetOptions } from './onset'

export interface DetectorEvents {
  /** Click onset in AudioContext time (seconds) and its peak amplitude. */
  onShot?: (t: number, peak: number) => void
  /** Peak envelope level over the last ~50 ms. */
  onLevel?: (level: number) => void
}

export class ClickDetector {
  private stream: MediaStream | null = null
  private node: AudioWorkletNode | null = null
  private nodes: AudioNode[] = []
  /** Return true to ignore a click at ctx time t (e.g. one of our own cues playing). */
  gate: (t: number) => boolean = () => false

  constructor(
    private ctx: AudioContext,
    private events: DetectorEvents,
  ) {}

  async start(options: OnsetOptions): Promise<void> {
    setAudioSession('play-and-record')
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
    })
    await this.ctx.audioWorklet.addModule(workletUrl)
    const src = this.ctx.createMediaStreamSource(this.stream)
    const hp = this.ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 2000
    hp.Q.value = 0.7
    this.node = new AudioWorkletNode(this.ctx, 'click-detector', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    })
    // Browsers only pull nodes that reach the destination; the worklet outputs silence.
    const mute = this.ctx.createGain()
    mute.gain.value = 0
    src.connect(hp).connect(this.node).connect(mute).connect(this.ctx.destination)
    this.nodes = [src, hp, this.node, mute]
    this.node.port.onmessage = (e: MessageEvent) => {
      const d = e.data
      if (d.type === 'onset') {
        const t = d.frame / this.ctx.sampleRate
        if (!this.gate(t)) this.events.onShot?.(t, d.peak)
      } else if (d.type === 'level') {
        this.events.onLevel?.(d.level)
      }
    }
    this.setOptions(options)
  }

  setOptions(options: Partial<OnsetOptions>): void {
    this.node?.port.postMessage({ type: 'options', options })
  }

  stop(): void {
    for (const n of this.nodes) n.disconnect()
    this.nodes = []
    this.node = null
    for (const t of this.stream?.getTracks() ?? []) t.stop()
    this.stream = null
    setAudioSession('playback')
  }
}
