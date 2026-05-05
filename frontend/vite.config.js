import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendUrl = process.env.VITE_API_URL || 'http://localhost:3001';
const wsBackendUrl = backendUrl.replace(/^https/, 'wss').replace(/^http/, 'ws');

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/ws':  { target: 'ws://localhost:3001', ws: true, changeOrigin: true },
    },
  },
  preview: {
    port: parseInt(process.env.PORT) || 4173,
    host: true,
    allowedHosts: ['tender-elegance-production.up.railway.app'],
    proxy: {
      '/api': { target: backendUrl, changeOrigin: true },
      '/ws':  { target: wsBackendUrl, ws: true, changeOrigin: true },
    },
  },
});
