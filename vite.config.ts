import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_');

  return {
    plugins: [react(), tailwindcss()],
    optimizeDeps: { entries: ['index.html'] },
    // Browser routes are rewritten to index.html, so assets must resolve from
    // the site root even when a learner opens a nested game URL directly.
    base: env.VITE_ASSET_BASE || '/',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            motion: ['motion/react'],
            charts: ['recharts'],
            lucide: ['lucide-react'],
          },
        },
      },
    },
  };
});
