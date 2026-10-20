import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Firebase alone is ~580 kB minified (140 kB gzipped) and can't be split further
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Large libraries in their own files, so an app update doesn't re-download them
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  test: {
    include: ['tests/unit/**/*.test.{js,ts}'],
    environment: 'node',
  },
});
