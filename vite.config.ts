import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const ios = mode === 'ios';
  // The app uses the same public account configuration as the website unless
  // an iOS-specific environment explicitly overrides it. Never load server secrets.
  const env = { ...(ios ? loadEnv('production', '.', 'VITE_') : {}), ...loadEnv(mode, '.', 'VITE_') };

  return {
    plugins: [react(), tailwindcss()],
    define: {
      ...(ios ? Object.fromEntries(Object.entries(env).map(([key,value]) => [`import.meta.env.${key}`, JSON.stringify(value)])) : {}),
      'import.meta.env.VITE_APP_TARGET': JSON.stringify(ios ? 'ios' : 'web'),
    },
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
      outDir: ios ? 'dist-ios' : 'dist',
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
