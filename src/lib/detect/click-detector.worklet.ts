import { OnsetDetector } from './onset'

declare const sampleRate: number
declare const currentFrame: number
declare class AudioWorkletProcessor {
  readonly port: MessagePort
}
declare function registerProcessor(name: string, ctor: new () => AudioWorkletProcessor): void

const LEVEL_EVERY_FRAMES = 2400

class ClickDetectorProcessor extends AudioWorkletProcessor {
  private det = new OnsetDetector(sampleRate, { threshold: 0.05 })
  private sinceLevel = 0

  constructor() {
    super()
    this.port.onmessage = (e: MessageEvent) => {
      if (e.data?.type === 'options') this.det.setOptions(e.data.options)
    }
  }

  process(inputs: Float32Array[][]): boolean {
    const ch = inputs[0]?.[0]
    if (!ch) return true
    for (const o of this.det.process(ch, currentFrame)) {
      this.port.postMessage({ type: 'onset', frame: o.frame, peak: o.peak })
    }
    this.sinceLevel += ch.length
    if (this.sinceLevel >= LEVEL_EVERY_FRAMES) {
      this.sinceLevel = 0
      this.port.postMessage({ type: 'level', level: this.det.takeLevel() })
    }
    return true
  }
}

registerProcessor('click-detector', ClickDetectorProcessor)
