# Testing on iOS

All commands run through pixi so mkcert and Bun come from the pinned environment.

## A. iOS Simulator on the Mac (fastest: UI, cues, PWA install)

1. Xcode → Settings → Components: install an iOS runtime, then `open -a Simulator`.
2. `pixi run dev`, then open `http://localhost:5173` in the simulator's Safari. `localhost` is a secure context, so
   the microphone and service worker work without HTTPS. The simulator uses the Mac's microphone.
3. Debug: Mac Safari → Settings → Advanced → "Show features for web developers", then Develop → Simulator → the page.
4. Share → Add to Home Screen tests standalone mode. For offline, run `pixi run build && pixi run bun run preview`.
5. Limits: no mute switch, no real screen lock or Wake Lock, and Mac audio latency differs from the phone. Do not
   calibrate click detection here.

## B. Real iPhone against the Mac dev server (real mic, speaker and latency)

The iPhone needs HTTPS it trusts for the microphone and service worker:

1. `pixi run mkcert -install`
2. `mkdir -p .certs && pixi run mkcert -cert-file .certs/dev.pem -key-file .certs/dev-key.pem <mac-name>.local <LAN-IP> localhost`
3. AirDrop `$(pixi run mkcert -CAROOT)/rootCA.pem` to the iPhone, then Settings → Profile Downloaded → Install, and
   Settings → General → About → Certificate Trust Settings → enable full trust.
4. `pixi run dev-https`, then on the iPhone (same Wi-Fi) open `https://<mac-name>.local:5173`.
5. No certificate setup: `pixi run tunnel` prints a public `https://*.trycloudflare.com` URL. It exposes your dev
   server publicly while it runs.
6. Debug: iPhone Settings → Safari → Advanced → Web Inspector, connect by USB, then Mac Safari → Develop → [iPhone].

## C. Real iPhone via Vercel (closest to production)

`pixi run bunx vercel` (preview) or push a branch, then open the preview URL on the iPhone. This covers HTTPS, PWA
install, offline, the mute switch, screen lock and the full calibration flow.

## What to check on a real device

- Cues are audible with the mute switch on and when the screen dims (the screen should stay awake while running).
- With detection on, cues still play and the mic prompt appears once; routing may switch to the receiver, so check
  volume.
- Calibrate, then dry-fire 10 times: compare detected count and timing with what you did.
- Add to Home Screen, enable airplane mode, reopen: the app and your presets still work.
