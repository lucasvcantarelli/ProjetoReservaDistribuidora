import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Funções puras (testadas em vite.htaccess.test.js) + plugin que preenche o .htaccess copiado
// de public-loja/ ou public-admin/ para a pasta de saída.

const MARCA_ORIGEM = '__SUPABASE_ORIGIN__';
const MARCA_BASE = '__BASE__';

// Garante barra no início e no fim; recusa a raiz, '..' e espaços (o admin não pode ficar na raiz).
export function normalizarAdminBase(valor) {
  const bruto = String(valor ?? '').trim();
  if (!bruto) {
    throw new Error('VITE_ADMIN_BASE não definido. Use um caminho como /painel-x7k2q/.');
  }
  if (/\s/.test(bruto) || bruto.includes('..') || bruto.includes('//')) {
    throw new Error(
      `VITE_ADMIN_BASE inválido ("${bruto}"): não pode ter espaços, ".." nem barras duplas.`,
    );
  }
  const base = `/${bruto.replace(/^\/+|\/+$/g, '')}/`;
  if (base === '//') {
    throw new Error(
      'VITE_ADMIN_BASE não pode ser "/": o painel precisa ficar em uma pasta, ex.: /painel-x7k2q/.',
    );
  }
  return base;
}

// Origem (https://<projeto>.supabase.co) a partir de VITE_FUNCTIONS_URL, para o CSP.
export function origemSupabase(url, { producao = false } = {}) {
  if (!url) {
    throw new Error(
      'VITE_FUNCTIONS_URL não definido. Crie o arquivo .env.production com ' +
        'VITE_FUNCTIONS_URL=https://<projeto>.supabase.co/functions/v1 (veja .env.production.example).',
    );
  }
  let origem;
  try {
    const analisada = new URL(url);
    if (analisada.origin === 'null') throw new Error('sem origem');
    origem = analisada.origin;
  } catch {
    throw new Error(
      `VITE_FUNCTIONS_URL inválido ("${url}"). Use https://<projeto>.supabase.co/functions/v1.`,
    );
  }
  if (producao && !origem.startsWith('https://')) {
    throw new Error(
      `VITE_FUNCTIONS_URL precisa começar com https:// no build de produção (recebido "${url}").`,
    );
  }
  return origem;
}

export function preencherHtaccess(modelo, { origem, base }) {
  return modelo.replaceAll(MARCA_ORIGEM, origem).replaceAll(MARCA_BASE, base);
}

export function htaccess() {
  let config;
  return {
    name: 'htaccess',
    apply: 'build',
    configResolved(resolvida) {
      config = resolvida;
      // Falha cedo, antes de gerar qualquer arquivo.
      origemSupabase(config.env.VITE_FUNCTIONS_URL, { producao: config.mode === 'production' });
    },
    async writeBundle() {
      const caminho = join(config.root, config.build.outDir, '.htaccess');
      const modelo = await readFile(caminho, 'utf8');
      const origem = origemSupabase(config.env.VITE_FUNCTIONS_URL, {
        producao: config.mode === 'production',
      });
      await writeFile(caminho, preencherHtaccess(modelo, { origem, base: config.base }));
    },
  };
}
