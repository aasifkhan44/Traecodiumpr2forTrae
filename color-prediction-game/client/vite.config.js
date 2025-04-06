import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    strictPort: false, // Allow port fallback
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5174, // Base port for HMR
      timeout: 30000,
      overlay: false
    }
  }
});
