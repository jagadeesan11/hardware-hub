import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const API_TARGET = 'http://127.0.0.1:4000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    // Proxy /api to Express in dev so the browser sees one origin and CORS
    // never enters the picture locally.
    proxy: {
      '/api': {
        // 127.0.0.1, not localhost: Node resolves localhost to ::1 first, and
        // an IPv4-only listener then fails with an opaque AggregateError.
        target: API_TARGET,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (error, req) => {
            const code = (error as NodeJS.ErrnoException).code;
            if (code === 'ECONNREFUSED' || error.name === 'AggregateError') {
              console.error(
                `\n[proxy] Cannot reach the API at ${API_TARGET} (${req.url}).\n` +
                  '        The backend is not running. Start it with:  npm run dev:api\n' +
                  '        If it exited immediately, check for a port 4000 collision.\n',
              );
            } else {
              console.error(`[proxy] ${req.url} failed:`, error.message);
            }
          });
        },
      },
    },
  },
});
