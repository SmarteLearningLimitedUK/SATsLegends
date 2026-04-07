import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isVercel = process.env.VERCEL === '1';
  const geminiApiKey = env.GEMINI_API_KEY ?? process.env.GEMINI_API_KEY ?? '';

  return {
    plugins: [react(), tailwindcss()],
    // Use absolute paths on Vercel to avoid asset resolution issues on rewritten routes.
    // Keep relative paths for non-Vercel static uploads.
    base: isVercel ? '/' : './',
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiApiKey),
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
            vendor: ['react', 'react-dom'],
            motion: ['motion/react'],
            charts: ['recharts'],
            lucide: ['lucide-react'],
          },
        },
      },
    },
  };
});
