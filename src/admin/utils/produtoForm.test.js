import { describe, expect, it } from 'vitest';
import {
  MSG_SEM_FORMA_DE_VENDA,
  formularioParaPayload,
  formularioVazio,
  produtoParaFormulario,
  resumoDoFardo,
  validarFormulario,
  variacaoVazia,
} from './produtoForm.js';

const CATEGORIA = '8f14e45f-ceea-467a-9575-9f7a8f2b1c11';

function valido(sobrescrever = {}) {
  return {
    ...formularioVazio(),
    nome: 'Copo',
    categoria_id: CATEGORIA,
    variacoes: [{ ...variacaoVazia(), nome_tamanho: '200 ml', preco_unidade_centavos: 150 }],
    ...sobrescrever,
  };
}

describe('validarFormulario', () => {
  it('formulário completo não tem erros', () => {
    expect(validarFormulario(valido())).toEqual({});
  });

  it('sem variação: pede ao menos um tamanho', () => {
    expect(validarFormulario(valido({ variacoes: [] })).variacoes).toBe(
      'Adicione ao menos um tamanho.',
    );
  });

  it('desmarcar unidade e fardo pede uma forma de venda', () => {
    const v = { ...variacaoVazia(), nome_tamanho: 'M', vende_unidade: false, vende_fardo: false };
    expect(validarFormulario(valido({ variacoes: [v] }))['variacoes.0']).toBe(
      MSG_SEM_FORMA_DE_VENDA,
    );
  });

  it('preço ausente e fardo sem quantidade têm mensagens por campo', () => {
    const v = { ...variacaoVazia(), nome_tamanho: 'M', vende_fardo: true };
    const erros = validarFormulario(valido({ variacoes: [v] }));
    expect(erros['variacoes.0.preco_unidade_centavos']).toBe('Informe um preço válido.');
    expect(erros['variacoes.0.preco_fardo_centavos']).toBe('Informe um preço válido.');
    expect(erros['variacoes.0.qtd_por_fardo']).toMatch(/unidades vêm no fardo/);
  });

  it('nome e categoria obrigatórios', () => {
    const erros = validarFormulario(valido({ nome: ' ', categoria_id: '' }));
    expect(erros.nome).toBe('Campo obrigatório.');
    expect(erros.categoria_id).toBe('Escolha uma categoria.');
  });
});

describe('formularioParaPayload', () => {
  it('zera preços das formas desmarcadas e converte a quantidade do fardo', () => {
    const v = {
      ...variacaoVazia(),
      nome_tamanho: 'G',
      vende_unidade: false,
      preco_unidade_centavos: 99,
      vende_fardo: true,
      qtd_por_fardo: '1000',
      preco_fardo_centavos: 8500,
    };
    const { variacoes } = formularioParaPayload(valido({ variacoes: [v] }));
    expect(variacoes[0]).toMatchObject({
      vende_unidade: false,
      preco_unidade_centavos: null,
      qtd_por_fardo: 1000,
      preco_fardo_centavos: 8500,
    });
    expect(variacoes[0]).not.toHaveProperty('chave');
  });

  it('produto do servidor vira formulário e volta ao mesmo payload', () => {
    const produto = {
      nome: 'Copo',
      categoria_id: CATEGORIA,
      descricao: null,
      ativo: false,
      variacoes: [
        {
          id: '9f14e45f-ceea-467a-9575-9f7a8f2b1c11',
          ativo: true,
          nome_tamanho: 'M',
          vende_unidade: true,
          preco_unidade_centavos: 150,
          vende_fardo: true,
          qtd_por_fardo: 50,
          preco_fardo_centavos: 5000,
        },
      ],
    };
    const payload = formularioParaPayload(produtoParaFormulario(produto));
    expect(payload.produto).toEqual({
      categoria_id: CATEGORIA,
      nome: 'Copo',
      descricao: '',
      ativo: false,
    });
    expect(payload.variacoes[0]).toMatchObject({ qtd_por_fardo: 50, id: produto.variacoes[0].id });
  });
});

describe('resumoDoFardo', () => {
  const base = { vende_fardo: true, qtd_por_fardo: '1000', preco_fardo_centavos: 8500 };

  it('mostra o preço por unidade do fardo com 3 casas quando preciso', () => {
    expect(resumoDoFardo(base).texto).toBe('R$ 0,085 por unidade no fardo');
  });

  it('mantém 2 casas quando não há fração de centavo', () => {
    expect(
      resumoDoFardo({ ...base, qtd_por_fardo: '100', preco_fardo_centavos: 15000 }).texto,
    ).toBe('R$ 1,50 por unidade no fardo');
  });

  it('avisa quando o fardo não é mais barato que a unidade', () => {
    const igual = resumoDoFardo({
      ...base,
      qtd_por_fardo: '100',
      preco_fardo_centavos: 1000,
      vende_unidade: true,
      preco_unidade_centavos: 10,
    });
    expect(igual.maisBarato).toBe(false);
    expect(
      resumoDoFardo({ ...base, vende_unidade: true, preco_unidade_centavos: 10 }).maisBarato,
    ).toBe(true);
    expect(
      resumoDoFardo({ ...base, vende_unidade: true, preco_unidade_centavos: 5 }).maisBarato,
    ).toBe(false);
  });

  it('compara em inteiros: R$ 9,99 por 1000 un é mais barato que R$ 0,01 a unidade', () => {
    const r = resumoDoFardo({
      vende_fardo: true,
      qtd_por_fardo: '1000',
      preco_fardo_centavos: 999,
      vende_unidade: true,
      preco_unidade_centavos: 1,
    });
    expect(r.maisBarato).toBe(true);
  });

  it('sem dados suficientes não mostra nada', () => {
    expect(resumoDoFardo({ ...base, qtd_por_fardo: '' })).toBeNull();
    expect(resumoDoFardo({ ...base, preco_fardo_centavos: null })).toBeNull();
    expect(resumoDoFardo({ ...base, vende_fardo: false })).toBeNull();
  });
});
