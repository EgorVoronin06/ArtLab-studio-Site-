import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_DOWN_MESSAGE =
  'API не отвечает на http://localhost:3000. Запустите Docker Desktop, в папке backend: npm run db:up, затем npm run start:dev (оставьте этот терминал открытым).';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure(proxy) {
          proxy.on('error', (_err, _req, res) => {
            const out = res as {
              headersSent?: boolean;
              writeHead?: (code: number, headers: Record<string, string>) => void;
              end?: (chunk: string) => void;
            };
            if (out?.headersSent || typeof out?.writeHead !== 'function' || typeof out?.end !== 'function') return;
            out.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
            out.end(
              JSON.stringify({
                statusCode: 502,
                error: 'Bad Gateway',
                message: API_DOWN_MESSAGE
              })
            );
          });
        }
      }
    }
  }
});
