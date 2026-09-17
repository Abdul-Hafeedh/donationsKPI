import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/donationsKPI/',
  plugins: [react()],
  server: {
    port: 5176,
    host: true,
  },
});
