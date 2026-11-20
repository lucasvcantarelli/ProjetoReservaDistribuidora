import { describe, expect, it } from 'vitest';
import {
  MAX_DESCRICAO,
  MAX_NOME_PRODUTO,
  MAX_NOME_TAMANHO,
  MAX_VARIACOES,
  menorPreco,
  validarProduto,
} from './produto.js';

const CATEGORIA = '00000000-0000-4000-8000-000000000001';
const produto = (extra = {}) => ({ categoria_id: CATEGORIA, nome: 'Guaraná', ...extra });
const unidade = (extra = {}) => ({
  nome_tamanho: '2L',
  vende_unidade: true,
  preco_unidade_centavos: 850,
  ...extra,
});
const fardo = (extra = {}) => ({
  nome_tamanho: 'Lata',
  vende_fardo: true,
  qtd_por_fardo: 12,
  preco_fardo_centavos: 3600,
  ...extra,
});
const validar = (p, v) => validarProduto({ produto: p, variacoes: v });

describe('validarProduto', () => {
  it('aceita produto com variações por unidade e por fardo e normaliza', () => {
    const r = validar(produto({ nome: '  Guaraná  ' }), [unidade(), fardo()]);
    expect(r.ok).toBe(true);
    expect(r.valor.produto).toEqual({
      categoria_id: CATEGORIA,
      nome: 'Guaraná',
      descricao: '',
      ativo: true,
    });
    expect(r.valor.variacoes[0]).toMatchObject({
      id: null,
      ordem: 0,
      ativo: true,
      vende_fardo: false,
      qtd_por_fardo: null,
      preco_fardo_centavos: null,
    });
    expect(r.valor.variacoes[1]).toMatchObject({
      ordem: 1,
      vende_unidade: false,
      preco_unidade_centavos: null,
      qtd_por_fardo: 12,
    });
  });
  it('sem variações -> campos.variacoes', () => {
    expect(validar(produto(), []).campos.variacoes).toBeTruthy();
    expect(validar(produto(), undefined).campos.variacoes).toBeTruthy();
  });
  it('mais de 30 variações -> campos.variacoes', () => {
    const muitas = Array.from({ length: MAX_VARIACOES + 1 }, () => unidade());
    expect(validar(produto(), muitas).campos.variacoes).toBeTruthy();
  });
  it('variação sem unidade nem fardo -> erro', () => {
    const r = validar(produto(), [{ nome_tamanho: '1L' }]);
    expect(r.ok).toBe(false);
    expect(r.campos['variacoes.0']).toBeTruthy();
  });
  it('fardo com qtd_por_fardo 1 -> erro', () => {
    const r = validar(produto(), [fardo({ qtd_por_fardo: 1 })]);
    expect(r.campos['variacoes.0.qtd_por_fardo']).toBeTruthy();
  });
  it('preço em string "10,50", decimal, zero ou negativo -> erro', () => {
    for (const preco of ['10,50', 10.5, 0, -5, null]) {
      const r = validar(produto(), [unidade({ preco_unidade_centavos: preco })]);
      expect(r.campos['variacoes.0.preco_unidade_centavos']).toBeTruthy();
    }
    const f = validar(produto(), [fardo({ preco_fardo_centavos: '36,00' })]);
    expect(f.campos['variacoes.0.preco_fardo_centavos']).toBeTruthy();
  });
  it('nome obrigatório e limites de tamanho', () => {
    expect(validar(produto({ nome: '  ' }), [unidade()]).campos.nome).toBeTruthy();
    expect(validar(produto({ nome: 'a'.repeat(MAX_NOME_PRODUTO + 1) }), [unidade()]).ok).toBe(
      false,
    );
    expect(validar(produto({ descricao: 'a'.repeat(MAX_DESCRICAO + 1) }), [unidade()]).ok).toBe(
      false,
    );
    const r = validar(produto(), [unidade({ nome_tamanho: 'a'.repeat(MAX_NOME_TAMANHO + 1) })]);
    expect(r.campos['variacoes.0.nome_tamanho']).toBeTruthy();
  });
  it('categoria_id precisa ser UUID', () => {
    expect(validar(produto({ categoria_id: 'x' }), [unidade()]).campos.categoria_id).toBeTruthy();
    expect(validar(produto({ categoria_id: undefined }), [unidade()]).ok).toBe(false);
  });
  it('id de variação inválido ou repetido -> erro', () => {
    expect(validar(produto(), [unidade({ id: 'x' })]).campos['variacoes.0.id']).toBeTruthy();
    const id = '00000000-0000-4000-8000-000000000009';
    expect(validar(produto(), [unidade({ id }), fardo({ id })]).campos.variacoes).toBeTruthy();
    expect(validar(produto(), [unidade({ id })]).valor.variacoes[0].id).toBe(id);
  });
  it('entradas que não são objeto não quebram', () => {
    expect(validar(null, [unidade()]).ok).toBe(false);
    expect(validar(produto(), [null]).campos['variacoes.0']).toBeTruthy();
  });
  it('preço de forma não vendida é ignorado (zerado)', () => {
    const r = validar(produto(), [unidade({ preco_fardo_centavos: 'lixo', qtd_por_fardo: 'x' })]);
    expect(r.ok).toBe(true);
    expect(r.valor.variacoes[0].preco_fardo_centavos).toBeNull();
  });
});

describe('menorPreco', () => {
  it('considera só formas vendidas', () => {
    expect(
      menorPreco([
        { vende_unidade: true, preco_unidade_centavos: 500 },
        { vende_fardo: true, preco_fardo_centavos: 300 },
        { vende_unidade: false, preco_unidade_centavos: 1 },
      ]),
    ).toBe(300);
    expect(menorPreco([])).toBeNull();
  });
});
