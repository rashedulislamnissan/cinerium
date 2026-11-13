import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // three.js lives in the lazily loaded 3D chunk (~350 KB gz, within the plan's 450 KB budget)
    chunkSizeWarningLimit: 1300,
  },
});
