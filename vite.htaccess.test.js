import { describe, it, expect } from 'vitest';
import { normalizarAdminBase, origemSupabase, preencherHtaccess } from './vite.htaccess.js';

describe('normalizarAdminBase', () => {
  it('garante barra no início e no fim', () => {
    expect(normalizarAdminBase('painel-x7k2q')).toBe('/painel-x7k2q/');
    expect(normalizarAdminBase('/painel-x7k2q')).toBe('/painel-x7k2q/');
    expect(normalizarAdminBase('painel-x7k2q/')).toBe('/painel-x7k2q/');
    expect(normalizarAdminBase(' /painel-x7k2q/ ')).toBe('/painel-x7k2q/');
    expect(normalizarAdminBase('/a/b/')).toBe('/a/b/');
  });

  it('recusa raiz, vazio, "..", espaços e barras duplas', () => {
    for (const ruim of ['/', '//', '', undefined, '/../x/', '/a b/', '/a//b/']) {
      expect(() => normalizarAdminBase(ruim)).toThrow(/VITE_ADMIN_BASE/);
    }
  });
});

describe('origemSupabase', () => {
  it('extrai a origem da URL das funções', () => {
    expect(origemSupabase('https://abc.supabase.co/functions/v1', { producao: true })).toBe(
      'https://abc.supabase.co',
    );
  });

  it('falha com URL ausente ou inválida', () => {
    expect(() => origemSupabase('')).toThrow(/VITE_FUNCTIONS_URL não definido/);
    expect(() => origemSupabase(undefined)).toThrow(/VITE_FUNCTIONS_URL não definido/);
    expect(() => origemSupabase('lixo')).toThrow(/inválido/);
  });

  it('em produção exige https; fora dela aceita http', () => {
    expect(() => origemSupabase('http://127.0.0.1:54321/functions/v1', { producao: true })).toThrow(
      /https/,
    );
    expect(origemSupabase('http://127.0.0.1:54321/functions/v1')).toBe('http://127.0.0.1:54321');
  });
});

describe('preencherHtaccess', () => {
  it('troca todas as marcas', () => {
    const saida = preencherHtaccess(
      'a __SUPABASE_ORIGIN__ b __SUPABASE_ORIGIN__ c __BASE__index.html',
      {
        origem: 'https://x.supabase.co',
        base: '/p/',
      },
    );
    expect(saida).toBe('a https://x.supabase.co b https://x.supabase.co c /p/index.html');
  });
});
