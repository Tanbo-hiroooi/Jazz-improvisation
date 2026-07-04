import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // 相対パスで出力: GitHub Pages のサブパス(/Jazz-improvisation/)配下でも動くように
  base: './',
  plugins: [react()],
  server: {
    host: true,
    port: Number(process.env.PORT) || 5173,
  },
});
