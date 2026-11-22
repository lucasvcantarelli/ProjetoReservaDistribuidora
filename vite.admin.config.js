import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { htmlComoIndex } from './vite.html-como-index.js';
import { favicon } from './vite.favicon.js';
import { exigirCaminhoSecreto, htaccess, normalizarAdminBase } from './vite.htaccess.js';
import { spaDev } from './vite.spa-dev.js';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const valor = process.env.VITE_ADMIN_BASE || env.VITE_ADMIN_BASE;
  // No build o caminho é obrigatório e validado; no dev, sem valor, usa a raiz.
  const base = valor || command === 'build' ? normalizarAdminBase(valor) : '/';
  // Build de produção (o que vai para a Locaweb): o caminho precisa ser secreto.
  // `npm run verificar` usa o modo "verificacao", que aceita o caminho de exemplo.
  if (command === 'build' && mode === 'production') exigirCaminhoSecreto(base);
  return {
    plugins: [react(), htmlComoIndex('admin.html'), htaccess(), favicon(), spaDev('admin.html')],
    base,
    publicDir: 'public-admin',
    build: {
      outDir: 'dist/admin',
      emptyOutDir: true,
      rollupOptions: { input: 'admin.html' },
    },
  };
});
