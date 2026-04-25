import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const useRelativeBase = (
    mode === 'development'
    && (env.VITE_RELATIVE_BASE === '1' || process.env.VITE_RELATIVE_BASE === '1')
  );
  const geminiApiKey = env.GEMINI_API_KEY ?? process.env.GEMINI_API_KEY ?? '';
  const buildId = env.VITE_BUILD_ID ?? process.env.VITE_BUILD_ID ?? new Date().toISOString();

  return {
    plugins: [react(), tailwindcss()],
    assetsInclude: ['**/*.mpeg'],
    // Deep links such as /minigame/share-splitter need absolute asset paths.
    // Set VITE_RELATIVE_BASE=1 only for static file uploads that require relative assets.
    base: useRelativeBase ? './' : '/',
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiApiKey),
      'import.meta.env.VITE_BUILD_ID': JSON.stringify(buildId),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      allowedHosts: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
      strictPort: true,
      allowedHosts: true,
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
