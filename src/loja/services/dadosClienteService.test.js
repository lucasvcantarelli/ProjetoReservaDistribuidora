import { describe, expect, it } from 'vitest';
import {
  CHAVE_DADOS_CLIENTE,
  IDENTIFICACAO_VAZIA,
  dadosClienteService,
} from './dadosClienteService.js';

const PJ = {
  ...IDENTIFICACAO_VAZIA,
  tipo_pessoa: 'PJ',
  razao_social: 'Bar do Zé Ltda',
  cnpj: '11.222.333/0001-81',
  nome: 'Zé',
  telefone: '(11) 3333-4444',
  cep: '01310-100',
  uf: 'SP',
  rua: 'Rua A',
  numero: '10',
  bairro: 'Centro',
  cidade: 'São Paulo',
};

describe('dadosClienteService', () => {
  it('sem nada guardado lê null', () => {
    expect(dadosClienteService.ler()).toBeNull();
  });

  it('salva e lê de volta os dados', () => {
    expect(dadosClienteService.salvar(PJ)).toBe(true);
    expect(dadosClienteService.ler()).toEqual(PJ);
  });

  it('pessoa física nunca guarda razão social nem documento', () => {
    dadosClienteService.salvar({ ...PJ, tipo_pessoa: 'PF' });
    expect(dadosClienteService.ler()).toMatchObject({
      tipo_pessoa: 'PF',
      razao_social: '',
      cnpj: '',
    });
  });

  it('não guarda CPF, e-mail nem outros campos desconhecidos', () => {
    dadosClienteService.salvar({ ...PJ, cpf: '12345678909', email: 'a@b.com' });
    const bruto = window.localStorage.getItem(CHAVE_DADOS_CLIENTE);
    expect(bruto).not.toMatch(/cpf|email|12345678909/);
  });

  it('recusa salvar dados malformados', () => {
    expect(dadosClienteService.salvar({ ...PJ, uf: 'XX' })).toBe(false);
    expect(dadosClienteService.salvar({ ...PJ, tipo_pessoa: 'Z' })).toBe(false);
    expect(dadosClienteService.salvar(null)).toBe(false);
    expect(window.localStorage.getItem(CHAVE_DADOS_CLIENTE)).toBeNull();
  });

  it('esquecer remove a chave', () => {
    dadosClienteService.salvar(PJ);
    dadosClienteService.esquecer();
    expect(dadosClienteService.ler()).toBeNull();
  });

  it.each([
    ['texto que não é JSON', '{x'],
    ['número', '5'],
    ['sem versão', JSON.stringify({ dados: PJ })],
    ['UF inválida', JSON.stringify({ v: 1, dados: { ...PJ, uf: 'ZZ' } })],
    ['campo longo demais', JSON.stringify({ v: 1, dados: { ...PJ, nome: 'a'.repeat(500) } })],
  ])('formato inválido (%s) vira null e a chave é removida', (_, bruto) => {
    window.localStorage.setItem(CHAVE_DADOS_CLIENTE, bruto);
    expect(dadosClienteService.ler()).toBeNull();
    expect(window.localStorage.getItem(CHAVE_DADOS_CLIENTE)).toBeNull();
  });

  it('limparLegado remove a sessão antiga de cliente e preserva o resto', () => {
    window.localStorage.setItem('reserva.sessao.cliente', '{"sessao":{}}');
    window.localStorage.setItem('reserva.admin.sessao', 'admin');
    window.localStorage.setItem('reserva.carrinho', '[]');
    dadosClienteService.salvar(PJ);
    dadosClienteService.limparLegado();
    expect(window.localStorage.getItem('reserva.sessao.cliente')).toBeNull();
    expect(window.localStorage.getItem('reserva.admin.sessao')).toBe('admin');
    expect(window.localStorage.getItem('reserva.carrinho')).toBe('[]');
    expect(dadosClienteService.ler()).toEqual(PJ);
  });
});
