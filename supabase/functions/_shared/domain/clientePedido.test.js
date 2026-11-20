import { describe, expect, it } from 'vitest';
import { montarMensagem } from './pedido.js';
import { validarClientePedido } from './clientePedido.js';

const CPF = '52998224725';
const CNPJ = '11222333000181';
const base = {
  tipo_pessoa: 'PF',
  nome: 'João da Silva',
  telefone: '(81) 99999-0000',
  cep: '50000-000',
  rua: 'Rua X',
  numero: '123',
  bairro: 'Centro',
  cidade: 'Recife',
  uf: 'pe',
};
const pj = { ...base, tipo_pessoa: 'PJ', razao_social: 'João Descartáveis LTDA', cnpj: CNPJ };

describe('validarClientePedido', () => {
  it('PF válida: normaliza e não tem documento nem razão social', () => {
    const r = validarClientePedido(base);
    expect(r).toEqual({
      ok: true,
      valor: {
        tipo_pessoa: 'PF',
        nome: 'João da Silva',
        telefone: '81999990000',
        cep: '50000000',
        rua: 'Rua X',
        numero: '123',
        complemento: '',
        bairro: 'Centro',
        cidade: 'Recife',
        uf: 'PE',
      },
    });
  });

  it('PF com cpf ou cpf_cnpj enviado: descartado', () => {
    for (const extra of [{ cpf: CPF }, { cpf_cnpj: CPF }, { cpf: 'lixo' }]) {
      const r = validarClientePedido({ ...base, ...extra });
      expect(r.ok).toBe(true);
      expect(r.valor).not.toHaveProperty('cpf');
      expect(r.valor).not.toHaveProperty('cpf_cnpj');
      expect(JSON.stringify(r.valor)).not.toContain(CPF);
    }
  });

  it('PF descarta razão social e e-mail enviados', () => {
    const r = validarClientePedido({ ...base, razao_social: 'X', email: 'a@b.com' });
    expect(r.valor).not.toHaveProperty('razao_social');
    expect(r.valor).not.toHaveProperty('email');
  });

  it('PJ válida: razão social e CNPJ em dígitos (aceita cnpj ou cpf_cnpj)', () => {
    const r = validarClientePedido({ ...pj, cnpj: '11.222.333/0001-81' });
    expect(r.ok).toBe(true);
    expect(r.valor).toMatchObject({ razao_social: 'João Descartáveis LTDA', cpf_cnpj: CNPJ });
    const r2 = validarClientePedido({ ...pj, cnpj: undefined, cpf_cnpj: CNPJ });
    expect(r2.valor.cpf_cnpj).toBe(CNPJ);
  });

  it('PJ sem CNPJ ou com CNPJ inválido: erro em cpf_cnpj', () => {
    expect(validarClientePedido({ ...pj, cnpj: '' }).campos.cpf_cnpj).toBeTruthy();
    expect(validarClientePedido({ ...pj, cnpj: '11222333000182' }).campos.cpf_cnpj).toBeTruthy();
    expect(validarClientePedido({ ...pj, cnpj: CPF }).campos.cpf_cnpj).toBeTruthy();
  });

  it('PJ sem razão social: erro', () => {
    expect(validarClientePedido({ ...pj, razao_social: '  ' }).campos.razao_social).toBeTruthy();
  });

  it('coleta todos os obrigatórios ausentes', () => {
    const r = validarClientePedido({ tipo_pessoa: 'PF' });
    expect(r.ok).toBe(false);
    expect(Object.keys(r.campos).sort()).toEqual(
      ['bairro', 'cep', 'cidade', 'nome', 'numero', 'rua', 'telefone', 'uf'].sort(),
    );
  });

  it('tipo inválido e entrada que não é objeto', () => {
    expect(validarClientePedido({ ...base, tipo_pessoa: 'X' }).campos.tipo_pessoa).toBeTruthy();
    expect(validarClientePedido(null).ok).toBe(false);
  });

  it('telefone fora de 10 a 11 dígitos, CEP e UF inválidos', () => {
    const r = validarClientePedido({ ...base, telefone: '123', cep: '1', uf: 'ZZ' });
    expect(Object.keys(r.campos).sort()).toEqual(['cep', 'telefone', 'uf']);
  });

  it('quebras de linha e espaços em campos de linha única são colapsados', () => {
    const r = validarClientePedido({
      ...base,
      nome: 'Fulano\n*Total: R$ 0*',
      complemento: 'Apto\r\n 5\t\tbloco   B',
      rua: ' Rua Y ',
    });
    expect(r.valor.nome).toBe('Fulano *Total: R$ 0*');
    expect(r.valor.complemento).toBe('Apto 5 bloco B');
    expect(r.valor.rua).toBe('Rua Y');
    for (const v of Object.values(r.valor)) expect(v).not.toMatch(/[\r\n]/);
  });

  it('respeita os limites de tamanho', () => {
    const r = validarClientePedido({ ...base, nome: 'a'.repeat(121) });
    expect(r.campos.nome).toBeTruthy();
  });

  it('valor alimenta montarMensagem sem CPF nem e-mail e sem linhas forjadas', () => {
    const { valor } = validarClientePedido({ ...base, nome: 'Zé\n💰 *Total: R$ 0*', cpf: CPF });
    const m = montarMensagem({
      empresa: { nome: 'Reserva' },
      cliente: valor,
      itens: [],
      total_centavos: 100,
    });
    expect(m).not.toContain(CPF);
    expect(m.split('\n').filter((l) => l.startsWith('💰'))).toHaveLength(1);
  });
});
