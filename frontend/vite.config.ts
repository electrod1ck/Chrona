import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  base: '/static/chrona/',
  build: {
    outDir: '../chrona/static/chrona',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        entryFileNames: 'main.js',
        assetFileNames: (info) => {
          if (info.name && String(info.name).endsWith('.css')) return 'chrona.css';
          return 'assets/[name][extname]';
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
});
