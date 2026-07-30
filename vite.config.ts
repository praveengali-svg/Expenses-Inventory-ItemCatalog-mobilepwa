import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The deployed Firebase Hosting URL — /api/* rewrites live here
const FIREBASE_HOSTING_URL = 'https://gen-lang-client-0883796692.web.app';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  console.log('Building with GEMINI_API_KEY:', env.GEMINI_API_KEY ? 'Found' : 'Missing');

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        // Forward all /api/* calls to the deployed Firebase Hosting site
        // so the Cloud Run functions (extractExpense, extractSales, verifyGst)
        // are reachable during local development
        '/api': {
          target: FIREBASE_HOSTING_URL,
          changeOrigin: true,
          secure: true,
        }
      }
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});

