import { type Preset, validatePreset } from './preset'

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

export function encodePreset(p: Preset): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(p)))
}

export function decodePreset(s: string): Preset | null {
  try {
    const json = new TextDecoder('utf-8', { fatal: true }).decode(fromBase64Url(s))
    return validatePreset(JSON.parse(json))
  } catch {
    return null
  }
}

export function shareUrl(p: Preset, base = location.href.split('#')[0]): string {
  return `${base}#p=${encodePreset(p)}`
}

/** Extracts the preset from a URL hash like `#p=...`; null if absent or invalid. */
export function presetFromHash(hash: string): Preset | null {
  const m = /^#p=([A-Za-z0-9_-]+)$/.exec(hash)
  return m ? decodePreset(m[1]) : null
}
