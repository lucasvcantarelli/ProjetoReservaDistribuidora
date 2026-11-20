import { beforeEach, describe, expect, it } from 'vitest';
import { CHAVE_CARRINHO, carrinhoService } from './carrinhoService.js';

const ITEM = {
  variacao_id: 'v1',
  forma: 'unidade',
  quantidade: 2,
  produto_id: 'p1',
  produto_nome: 'Copo',
  nome_tamanho: 'M',
  preco_centavos: 150,
  foto_url: null,
};

describe('carrinhoService', () => {
  beforeEach(() => window.localStorage.clear());

  it('adicionar o mesmo item duas vezes soma a quantidade em uma só linha', () => {
    carrinhoService.adicionar(ITEM);
    const itens = carrinhoService.adicionar({ ...ITEM, quantidade: 3 });
    expect(itens).toHaveLength(1);
    expect(itens[0]).toMatchObject({ chave: 'v1:unidade', quantidade: 5 });
  });

  it('mesma variação em forma diferente vira outra linha', () => {
    carrinhoService.adicionar(ITEM);
    const itens = carrinhoService.adicionar({ ...ITEM, forma: 'fardo', qtd_por_fardo: 1000 });
    expect(itens.map((i) => i.chave)).toEqual(['v1:unidade', 'v1:fardo']);
  });

  it('limita a soma a 99.999', () => {
    carrinhoService.adicionar({ ...ITEM, quantidade: 99000 });
    expect(carrinhoService.adicionar({ ...ITEM, quantidade: 5000 })[0].quantidade).toBe(99999);
  });

  it('descarta item a item o que for inválido ao ler', () => {
    const valido = { ...ITEM, chave: 'v1:unidade' };
    window.localStorage.setItem(
      CHAVE_CARRINHO,
      JSON.stringify([{ lixo: 1 }, valido, { ...valido, quantidade: 0 }, null, 'texto']),
    );
    expect(carrinhoService.ler()).toEqual([valido]);
  });

  it('JSON corrompido ou não-lista vira carrinho vazio', () => {
    window.localStorage.setItem(CHAVE_CARRINHO, '{quebrado');
    expect(carrinhoService.ler()).toEqual([]);
    window.localStorage.setItem(CHAVE_CARRINHO, '{"a":1}');
    expect(carrinhoService.ler()).toEqual([]);
  });

  it('fardo sem qtd_por_fardo é inválido', () => {
    window.localStorage.setItem(CHAVE_CARRINHO, JSON.stringify([{ ...ITEM, forma: 'fardo' }]));
    expect(carrinhoService.ler()).toEqual([]);
  });

  it('altera quantidade, ignora valor inválido, remove e limpa', () => {
    carrinhoService.adicionar(ITEM);
    expect(carrinhoService.alterarQuantidade('v1:unidade', 7)[0].quantidade).toBe(7);
    expect(carrinhoService.alterarQuantidade('v1:unidade', 0)[0].quantidade).toBe(7);
    expect(carrinhoService.alterarQuantidade('v1:unidade', 1.5)[0].quantidade).toBe(7);
    expect(carrinhoService.remover('v1:unidade')).toEqual([]);
    carrinhoService.adicionar(ITEM);
    expect(carrinhoService.limpar()).toEqual([]);
    expect(carrinhoService.ler()).toEqual([]);
  });

  it('atualizarPrecos troca só o preço dos itens informados', () => {
    carrinhoService.adicionar(ITEM);
    const itens = carrinhoService.atualizarPrecos({ 'v1:unidade': 175, 'x:fardo': 1 });
    expect(itens[0].preco_centavos).toBe(175);
    expect(carrinhoService.precosVistos()).toEqual({ 'v1:unidade': 175 });
  });

  it('precosVistos mapeia chave para preço em centavos', () => {
    carrinhoService.adicionar(ITEM);
    expect(carrinhoService.precosVistos()).toEqual({ 'v1:unidade': 150 });
  });
});
