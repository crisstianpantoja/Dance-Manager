import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/react-router|\/react\/|\/react-dom\//.test(id)) return 'vendor-react'
          if (id.includes('@supabase')) return 'vendor-supabase'
          if (id.includes('qr-scanner') || id.includes('barcode-detector') || id.includes('qrcode.react'))
            return 'vendor-qr'
          return 'vendor'
        },
      },
    },
  },
})
