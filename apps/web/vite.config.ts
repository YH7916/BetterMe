import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', setupFiles: ['./tests/setup.ts'] },
  server: { proxy: { '/api': 'http://localhost:8787' } },
});
