import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': 'http://localhost:3001',
      '/admin': 'http://localhost:3001',
    },
  },
});
