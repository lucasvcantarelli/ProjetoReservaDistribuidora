import { describe, expect, it } from 'vitest';
import { ehUuid, escaparLike, gerarSlug, prefixoSlug, prepararBusca, slugUnico } from './texto.js';

describe('escaparLike', () => {
  it('escapa %, _ e barra invertida', () => {
    expect(escaparLike('100%')).toBe('100\\%');
    expect(escaparLike('a_b')).toBe('a\\_b');
    expect(escaparLike('a\\b')).toBe('a\\\\b');
  });
  it('mantém texto comum', () => {
    expect(escaparLike('refrigerante 2L')).toBe('refrigerante 2L');
  });
  it('escapa a barra antes dos curingas', () => {
    expect(escaparLike('\\%')).toBe('\\\\\\%');
  });
});

describe('ehUuid', () => {
  it('aceita UUID e rejeita o resto', () => {
    expect(ehUuid('00000000-0000-4000-8000-000000000000')).toBe(true);
    expect(ehUuid('abc')).toBe(false);
    expect(ehUuid(null)).toBe(false);
    expect(ehUuid(123)).toBe(false);
  });
});

describe('gerarSlug', () => {
  it('minúsculas, sem acentos e com hífens', () => {
    expect(gerarSlug('  Água & Sucos Naturais!  ')).toBe('agua-sucos-naturais');
    expect(gerarSlug('Cervejas -- Açaí')).toBe('cervejas-acai');
  });
  it('limita a 60 caracteres sem hífen no fim', () => {
    const slug = gerarSlug(`${'a'.repeat(59)} bbb`);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith('-')).toBe(false);
  });
  it('texto sem letras/dígitos vira o padrão', () => {
    expect(gerarSlug('!!!')).toBe('categoria');
    expect(gerarSlug(undefined)).toBe('categoria');
  });
});

describe('slugUnico', () => {
  it('mantém o slug livre', () => {
    expect(slugUnico('agua', ['suco'])).toBe('agua');
  });
  it('acrescenta -2, -3... em caso de conflito', () => {
    expect(slugUnico('agua', ['agua'])).toBe('agua-2');
    expect(slugUnico('agua', ['agua', 'agua-2'])).toBe('agua-3');
  });
  it('respeita o tamanho máximo com sufixo', () => {
    const base = 'a'.repeat(60);
    const r = slugUnico(base, [base]);
    expect(r.length).toBe(60);
    expect(r.endsWith('-2')).toBe(true);
  });
});

describe('prepararBusca', () => {
  it('remove asteriscos, apara e limita', () => {
    expect(prepararBusca('  a*b* ', 10)).toBe('ab');
    expect(prepararBusca('abcdef', 3)).toBe('abc');
    expect(prepararBusca(undefined, 3)).toBe('');
    expect(prepararBusca(5, 3)).toBe('');
  });
});

describe('prefixoSlug', () => {
  it('base curta fica inteira', () => {
    expect(prefixoSlug('agua')).toBe('agua');
  });
  it('é prefixo de todos os candidatos de slugUnico, mesmo com base de 59 caracteres', () => {
    const base = 'a'.repeat(59);
    const prefixo = prefixoSlug(base);
    const usados = [base];
    for (let n = 2; n <= 12; n += 1) {
      const candidato = slugUnico(base, usados);
      expect(candidato.startsWith(prefixo)).toBe(true);
      expect(candidato.endsWith(`-${n}`)).toBe(true);
      usados.push(candidato);
    }
  });
  it('base de 60 caracteres: próximo livre avança em vez de repetir -2', () => {
    const base = 'b'.repeat(60);
    const dois = slugUnico(base, [base]);
    expect(slugUnico(base, [base, dois]).endsWith('-3')).toBe(true);
  });
});
