import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid()],
  server: {
    // Listen on all network interfaces within the container
    host: '0.0.0.0', 

    // The internal port inside the container
    port: 5173,      

    // Disable WebSocket-based HMR for Docker reliability
    hmr: false,

    // This helps Vite detect file changes when running in Docker
    watch: {
      usePolling: true,
      interval: 1000
    },

    // Headers required for SharedWorker
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  optimizeDeps: {
    include: ['sql.js', 'papaparse'],
  },
  worker: {
    format: 'es',
    rollupOptions: {
      external: [],
    },
  },
});
