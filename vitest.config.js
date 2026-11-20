import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.js'],
    include: [
      'vite.*.test.js',
      'src/**/*.test.{js,jsx}',
      'supabase/**/*.test.js',
      'scripts/**/*.test.js',
    ],
  },
});
