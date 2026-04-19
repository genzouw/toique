import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import Sitemap from 'vite-plugin-sitemap';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    Sitemap({
      hostname: 'https://toique.pages.dev',
      dynamicRoutes: ['/help', '/pricing', '/contact', '/login', '/signup'],
      exclude: [
        '/dashboard',
        '/channels',
        '/forms',
        '/submissions',
        '/messages',
        '/onboarding',
      ],
      changefreq: 'monthly',
    }),
  ],
  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      '.ngrok-free.dev',
      '.ngrok-free.app',
      '.ngrok.io',
      '.ngrok.app',
      'localhost',
    ],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    globals: false,
  },
});
