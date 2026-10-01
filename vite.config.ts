import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_');
  const isVercel = process.env.VERCEL === '1';
  const buildId = env.VITE_BUILD_ID ?? process.env.VITE_BUILD_ID ?? new Date().toISOString();

  return {
    plugins: [react(), tailwindcss()],
    optimizeDeps: { entries: ['index.html'] },
    // Use absolute paths on Vercel to avoid asset resolution issues on rewritten routes.
    // Keep relative paths for non-Vercel static uploads.
    base: env.VITE_ASSET_BASE || (isVercel ? '/' : './'),
    define: {
      'import.meta.env.VITE_BUILD_ID': JSON.stringify(buildId),
    },
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
