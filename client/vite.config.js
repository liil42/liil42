import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'liil42';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || (process.env.GITHUB_ACTIONS ? `/${repoName}/` : '/'),
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          markdown: ['react-markdown', 'remark-gfm'],
          qr: ['qrcode.react'],
          icons: ['lucide-react'],
          zip: ['jszip']
        }
      }
    },
    chunkSizeWarningLimit: 900
  },
  server: {
    proxy: {
      '/api': process.env.VITE_API_PROXY || 'http://localhost:3002'
    }
  }
});
