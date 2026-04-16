import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    // Vite 6 以降はデフォルトで外部ホストを拒否する。
    // 開発中は ngrok などの一時URLからもアクセスしたいので許可する。
    // 本番では Vite dev server を使わないため、dev用途に限定した設定。
    allowedHosts: [
      '.ngrok-free.dev',
      '.ngrok-free.app',
      '.ngrok.io',
      '.ngrok.app',
      'localhost',
    ],
  },
});
