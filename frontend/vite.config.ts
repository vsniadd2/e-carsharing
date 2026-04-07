import path from 'path'
import type { ServerResponse } from 'http'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// 127.0.0.1: на Windows «localhost» иногда уходит в ::1, тогда Docker/API на IPv4 даёт ECONNREFUSED / socket hang up
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:8080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@img': path.resolve(__dirname, '../img'),
      '@fleetSeed': path.resolve(__dirname, '../scripts/seed-fleet/fleet.json'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        configure(proxy) {
          proxy.on('error', (_err, _req, res) => {
            const msg = `Прокси /api → ${apiProxyTarget}: бэкенд не отвечает (запустите Postgres + EcoRide.Api).`
            const httpRes = res as ServerResponse
            if (httpRes && !httpRes.headersSent && typeof httpRes.writeHead === 'function') {
              httpRes.writeHead(502, { 'Content-Type': 'application/json' })
              httpRes.end(JSON.stringify({ error: msg }))
            }
          })
        },
      },
      '/hubs': {
        target: apiProxyTarget,
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
