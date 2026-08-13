import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      // Proxy API calls to production so `npm run dev` works standalone,
      // without a local `vercel dev` serving the functions.
      '/api': {
        target: 'https://polaroid.caic.ac.cn',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});