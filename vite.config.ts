import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/birthdaywebsite/' : '/',
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': 'http://localhost:3001',
      '/admin': 'http://localhost:3001',
    },
  },
}));
