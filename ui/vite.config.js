import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_PORT = process.env.API_PORT || 3001;
const UI_PORT = process.env.PORT || 3000;

export default defineConfig({
  plugins: [react()],
  server: {
    port: UI_PORT,
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true
      },
      '/media': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist'
  }
});
