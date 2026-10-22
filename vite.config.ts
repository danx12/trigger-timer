import { existsSync, readFileSync } from 'node:fs'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

const https =
  process.env.HTTPS && existsSync('.certs/dev.pem')
    ? { cert: readFileSync('.certs/dev.pem'), key: readFileSync('.certs/dev-key.pem') }
    : undefined

export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,wav,webmanifest}'] },
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Trigger Timer',
        short_name: 'Trigger',
        description: 'Interval trainer for air-rifle trigger control',
        theme_color: '#0b0f14',
        background_color: '#0b0f14',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: { https, allowedHosts: ['.trycloudflare.com', '.local'] },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
