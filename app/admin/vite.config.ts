import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { compression } from 'vite-plugin-compression2';
import path from 'node:path';

export default defineConfig({
  base: '/admin/',
  plugins: [
    react(),
    tailwindcss(),
    // Generate .gz alongside each asset (widely supported, small)
    compression({
      algorithm: 'gzip',
      exclude: [/\.(br|gz|zst)$/, /\.png$/, /\.jpg$/, /\.webp$/],
      threshold: 1024, // only compress files >1KB
      deleteOriginalAssets: false,
    }),
    // Generate .br alongside each asset (better ratio, modern browsers)
    compression({
      algorithm: 'brotliCompress',
      exclude: [/\.(br|gz|zst)$/, /\.png$/, /\.jpg$/, /\.webp$/],
      threshold: 1024,
      deleteOriginalAssets: false,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.UTTERLOG_API_DEV_TARGET || 'http://localhost:8080',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.UTTERLOG_API_DEV_TARGET || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
              priority: 20,
            },
            {
              name: 'vendor',
              test: /[\\/]node_modules[\\/](axios|zustand|react-hot-toast)[\\/]/,
              priority: 15,
            },
          ],
        },
      },
    },
  },
});
