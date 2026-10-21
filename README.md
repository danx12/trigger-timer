# Trigger Timer

Mobile-first, client-only web app for air-rifle trigger training. It loops a shot cycle with a distinct tone per phase
(Mount & Load → Aiming Area → Green Light → Hard Abort → Rest), lets you edit every tone and timing, saves presets on
the device, shares them as a base64 link, and can score dry-fire clicks heard by the microphone.

Svelte 5 · Vite · TypeScript · Bun · Biome · Vitest · PWA (offline). No backend.

## Setup

Dependencies other than npm packages come from [pixi](https://pixi.sh) (no Homebrew):

```bash
pixi install
pixi run install      # bun install + prek hooks (pre-commit and pre-push)
```

| Task                | Command                                                                        |
| ------------------- | ------------------------------------------------------------------------------ |
| Dev server          | `pixi run dev` (http://localhost:5173, also on the LAN)                        |
| HTTPS dev server    | `pixi run dev-https` (needs `.certs/`, see [iOS testing](docs/TESTING-IOS.md)) |
| Production build    | `pixi run build`                                                               |
| Tests               | `pixi run test`                                                                |
| Lint / format       | `pixi run lint` · `pixi run bun run format`                                    |
| Type check          | `pixi run check`                                                               |
| All hooks           | `pixi run prek run --all-files`                                                |
| Public HTTPS tunnel | `pixi run tunnel`                                                              |

## Browser support

Safari (iOS and macOS), Chrome (Android and desktop) and Firefox (desktop and Android). iOS Firefox and Chrome are
WebKit under the hood and behave like Safari. Firefox notes: the microphone and output devices must run at the same
sample rate (the app warns if not), and Firefox desktop does not install PWAs, but the offline cache still works.

## Using it

- **Timer**: pick a preset and press Start. Audio starts on that tap (required by Safari). The screen is kept awake.
- **Presets**: edit phase times, tone pitch/wave/length/repeats/volume (with ▶ preview) and spoken cue text. Share
  produces `…/#p=<base64url JSON>`; opening it offers to import. Presets live in `localStorage` (cookies are capped at
  4 KB, are sent with every request, and Safari expires them).
- **Detect**: calibrate the microphone click detector (3 s of silence, then 5 dry-fires). Detected shots are scored
  `before-aim / early / green / late` and kept in **History** (CSV export).

### How the click detector works

Microphone (echo cancellation, noise suppression and AGC off) → 2 kHz high-pass → `AudioWorklet` on the audio thread.
A 1 ms envelope must jump above both an absolute threshold and 6× the slow noise floor, then decay within 40 ms
(rejecting speech and tones). Onset times use the same sample clock as the cue scheduler, and clicks that coincide with
the app's own cues are ignored. Microphone input latency is not compensated, so treat hold times as ±~30 ms.

## Deploy

Vercel detects Vite and `bun.lock`: import the repo, or run `bunx vercel`. HTTPS (required for the microphone) is
automatic. `vercel.json` pins the build command and output directory.

## Testing on iOS

See [docs/TESTING-IOS.md](docs/TESTING-IOS.md): Simulator, a real iPhone against the Mac dev server, and Vercel previews.
