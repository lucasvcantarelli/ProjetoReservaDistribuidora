import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { htmlComoIndex } from './vite.html-como-index.js';
import { htaccess, normalizarAdminBase } from './vite.htaccess.js';
import { spaDev } from './vite.spa-dev.js';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const valor = process.env.VITE_ADMIN_BASE || env.VITE_ADMIN_BASE;
  // No build o caminho é obrigatório e validado; no dev, sem valor, usa a raiz.
  const base = valor || command === 'build' ? normalizarAdminBase(valor) : '/';
  return {
    plugins: [react(), htmlComoIndex('admin.html'), htaccess(), spaDev('admin.html')],
    base,
    publicDir: 'public-admin',
    build: {
      outDir: 'dist/admin',
      emptyOutDir: true,
      rollupOptions: { input: 'admin.html' },
    },
  };
});
