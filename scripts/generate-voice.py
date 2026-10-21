#!/usr/bin/env python3
"""Renders the built-in spoken cues to public/voice/*.wav (macOS only: uses `say` and `afconvert`).

    python3 scripts/generate-voice.py [--voice Samantha] [--rate 185]

Each clip is trimmed of leading/trailing silence, peak-normalized to -3 dBFS and given 4 ms fades so it starts and
ends at exactly zero (no clicks). Output: 22.05 kHz, 16-bit, mono WAV, which every browser can decode.
"""

import argparse
import array
import math
import subprocess
import tempfile
import wave
from pathlib import Path

WORDS = ["Mount", "Aim", "Green", "Abort", "Rest"]
OUT = Path(__file__).resolve().parent.parent / "public" / "voice"
RATE = 22050


def render(word: str, voice: str, wpm: int, tmp: Path) -> array.array:
    aiff = tmp / f"{word}.aiff"
    wav = tmp / f"{word}.wav"
    subprocess.run(["say", "-v", voice, "-r", str(wpm), "-o", str(aiff), word], check=True)
    subprocess.run(
        ["afconvert", "-f", "WAVE", "-d", f"LEI16@{RATE}", "-c", "1", str(aiff), str(wav)],
        check=True,
    )
    with wave.open(str(wav)) as w:
        assert w.getsampwidth() == 2 and w.getnchannels() == 1 and w.getframerate() == RATE
        samples = array.array("h")
        samples.frombytes(w.readframes(w.getnframes()))
    return samples


def process(samples: array.array) -> array.array:
    floor = 0.01 * 32768
    idx = [i for i, s in enumerate(samples) if abs(s) > floor]
    pad = int(0.02 * RATE)
    s = samples[max(0, idx[0] - pad) : idx[-1] + pad]
    peak = max(abs(x) for x in s)
    gain = (0.708 * 32767) / peak  # -3 dBFS
    fade = int(0.004 * RATE)
    out = array.array("h", (int(max(-32768, min(32767, x * gain))) for x in s))
    for i in range(fade):
        k = 0.5 - 0.5 * math.cos(math.pi * i / fade)
        out[i] = int(out[i] * k)
        out[-1 - i] = int(out[-1 - i] * k)
    out[0] = out[-1] = 0
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="Samantha")
    ap.add_argument("--rate", type=int, default=185, help="words per minute")
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as t:
        for word in WORDS:
            clip = process(render(word, args.voice, args.rate, Path(t)))
            path = OUT / f"{word.lower()}.wav"
            with wave.open(str(path), "wb") as w:
                w.setnchannels(1)
                w.setsampwidth(2)
                w.setframerate(RATE)
                w.writeframes(clip.tobytes())
            print(f"{path.name}: {len(clip) / RATE * 1000:.0f} ms, {path.stat().st_size / 1024:.0f} KiB")


if __name__ == "__main__":
    main()
