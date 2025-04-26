import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: true, // Ensure consistent port usage
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5175, // Match with server port
      timeout: 60000, // Increased timeout
      overlay: true, // Show errors in browser overlay
      clientPort: 5175 // Ensure client connects to correct port
    }
  }
});
