import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({ 
      registerType: 'autoUpdate',
      // Mivel a manifestet már itt definiáljuk, a public mappából törölhetjük
      // a manifest.json-t a későbbi félreértések elkerülése érdekében.
      manifest: {
        name: 'FamilyHub',
        short_name: 'FamilyHub',
        description: 'Családi Pénzügyi és Menedzsment Platform',
        start_url: '/',
        display: 'standalone', // <-- EZ A LEGFONTOSABB SOR
        background_color: '#f8fafc',
        theme_color: '#6366f1',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})