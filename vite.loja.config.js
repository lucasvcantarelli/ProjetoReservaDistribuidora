import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { htmlComoIndex } from './vite.html-como-index.js';
import { htaccess } from './vite.htaccess.js';
import { spaDev } from './vite.spa-dev.js';

export default defineConfig({
  plugins: [react(), htmlComoIndex('loja.html'), htaccess(), spaDev('loja.html')],
  publicDir: 'public-loja',
  build: {
    outDir: 'dist/loja',
    emptyOutDir: true,
    rollupOptions: { input: 'loja.html' },
  },
});
