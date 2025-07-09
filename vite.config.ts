import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid()],
  server: {
    // Listen on all network interfaces within the container
    host: '0.0.0.0', 

    // The internal port inside the container
    port: 5173,      

    // This is the key: tell Vite's client to connect to the port exposed by Docker
    hmr: {
      clientPort: 8080 
    },

    // This helps Vite detect file changes when running in Docker
    watch: {
      usePolling: true 
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
