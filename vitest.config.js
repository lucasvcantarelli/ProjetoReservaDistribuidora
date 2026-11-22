import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.js'],
    // Formulários digitados campo a campo com userEvent passam de 5 s com a suíte toda em paralelo.
    testTimeout: 15000,
    include: [
      'vite.*.test.js',
      'src/**/*.test.{js,jsx}',
      'supabase/**/*.test.js',
      'scripts/**/*.test.js',
    ],
  },
});
