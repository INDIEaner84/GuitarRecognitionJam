import path from 'path';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: true,
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      test: {
        environment: 'node',
        include: ['tests/**/*.test.ts'],
      },
      build: {
        // Tone.js, React und das Gemini-SDK sind groß; eigene Chunks halten
        // das Start-Bundle klein und verbessern das Caching.
        chunkSizeWarningLimit: 600,
        rollupOptions: {
          output: {
            manualChunks(id: string) {
              if (!id.includes('node_modules')) return;
              if (id.includes('node_modules/tone')) return 'tone';
              if (id.includes('node_modules/@google')) return 'genai';
              if (id.includes('node_modules/pdfjs-dist')) return 'pdf';
              if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'react';
            },
          },
        },
      },
    };
});
