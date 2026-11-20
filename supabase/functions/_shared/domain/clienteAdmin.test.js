import { describe, expect, it } from 'vitest';
import {
  interpretarBusca,
  perfilCliente,
  resumoCliente,
  unirPorId,
  validarClienteAdmin,
  validarEdicaoFicha,
} from './clienteAdmin.js';

const CPF = '52998224725';
const CNPJ = '11222333000181';
const pf = { tipo_pessoa: 'PF', cpf_cnpj: CPF, razao_social: null };
const pj = { tipo_pessoa: 'PJ', cpf_cnpj: CNPJ, razao_social: 'Empresa Ltda' };

describe('interpretarBusca', () => {
  it('vazio não busca', () => {
    expect(interpretarBusca('')).toBeNull();
  });
  it('só números e pontuação busca por dígitos', () => {
    expect(interpretarBusca('529.982')).toEqual({ tipo: 'documento', digitos: '529982' });
    expect(interpretarBusca('11.222/0001-81')).toEqual({
      tipo: 'documento',
      digitos: '11222000181',
    });
  });
  it('telefone com máscara também busca por dígitos', () => {
    expect(interpretarBusca('(81) 98888-7777')).toEqual({
      tipo: 'documento',
      digitos: '81988887777',
    });
  });
  it('texto, e-mail ou mistura busca por nome/e-mail', () => {
    expect(interpretarBusca('Maria')).toEqual({ tipo: 'texto', termo: 'Maria' });
    expect(interpretarBusca('3M')).toEqual({ tipo: 'texto', termo: '3M' });
    expect(interpretarBusca('a@b.com').tipo).toBe('texto');
  });
  it('só pontuação não busca', () => {
    expect(interpretarBusca('.-')).toBeNull();
  });
});

describe('unirPorId', () => {
  it('remove repetidos e ordena por nome sem diferenciar acento/caixa', () => {
    const a = { id: '1', nome: 'Ângela' };
    const b = { id: '2', nome: 'bruno' };
    const c = { id: '3', nome: 'Carlos' };
    expect(unirPorId([c, a], [b, a]).map((x) => x.id)).toEqual(['1', '2', '3']);
  });
});

describe('resumoCliente e perfilCliente', () => {
  it('formatam o documento conforme o tipo', () => {
    const base = { id: 'x', nome: 'N', email: 'e@e.com', telefone: '1', cidade: 'C', uf: 'SP' };
    expect(resumoCliente({ ...base, ...pf }).cpf_cnpj).toBe('529.982.247-25');
    expect(perfilCliente({ ...base, ...pj }).cpf_cnpj).toBe('11.222.333/0001-81');
    expect(resumoCliente({ ...base, ...pj }).razao_social).toBe('Empresa Ltda');
    expect(resumoCliente({ ...base, ...pf }).razao_social).toBeNull();
  });
});

describe('validarClienteAdmin', () => {
  const minimo = { tipo_pessoa: 'PF', nome: 'Maria' };

  it('ficha mínima: só tipo e nome; opcionais viram null e documento null', () => {
    const r = validarClienteAdmin(minimo);
    expect(r.ok).toBe(true);
    expect(r.valor).toMatchObject({
      tipo_pessoa: 'PF',
      nome: 'Maria',
      cpf_cnpj: null,
      razao_social: null,
      nome_fantasia: null,
      email: null,
      telefone: null,
      observacoes: '',
    });
  });

  it('documento vazio, em branco ou ausente vira null', () => {
    for (const cpf_cnpj of ['', '   ', undefined, null]) {
      expect(validarClienteAdmin({ ...minimo, cpf_cnpj }).valor.cpf_cnpj).toBeNull();
    }
  });

  it('nome obrigatório e tipo obrigatório', () => {
    const r = validarClienteAdmin({ nome: ' ' });
    expect(r.campos.nome).toBeTruthy();
    expect(r.campos.tipo_pessoa).toBeTruthy();
  });

  it('PF descarta também o nome fantasia (mesmo preenchido)', () => {
    const r = validarClienteAdmin({ ...minimo, razao_social: 'X Ltda', nome_fantasia: 'Fantasia' });
    expect(r.valor.nome_fantasia).toBeNull();
    const pj = validarClienteAdmin({
      tipo_pessoa: 'PJ',
      nome: 'A',
      razao_social: 'X Ltda',
      nome_fantasia: 'Fantasia',
    });
    expect(pj.valor.nome_fantasia).toBe('Fantasia');
  });

  it('PJ exige razão social; PF descarta razão social', () => {
    expect(validarClienteAdmin({ tipo_pessoa: 'PJ', nome: 'A' }).campos.razao_social).toBeTruthy();
    const r = validarClienteAdmin({ ...minimo, razao_social: 'X Ltda' });
    expect(r.valor.razao_social).toBeNull();
  });

  it('documento preenchido deve casar com o tipo', () => {
    expect(validarClienteAdmin({ ...minimo, cpf_cnpj: '529.982.247-25' }).valor.cpf_cnpj).toBe(CPF);
    expect(validarClienteAdmin({ ...minimo, cpf_cnpj: CNPJ }).campos.cpf_cnpj).toBeTruthy();
    const pjDados = { tipo_pessoa: 'PJ', nome: 'A', razao_social: 'A Ltda' };
    expect(validarClienteAdmin({ ...pjDados, cpf_cnpj: CPF }).campos.cpf_cnpj).toBeTruthy();
    expect(validarClienteAdmin({ ...pjDados, cpf_cnpj: CNPJ }).valor.cpf_cnpj).toBe(CNPJ);
    expect(validarClienteAdmin({ ...minimo, cpf_cnpj: '123' }).campos.cpf_cnpj).toBeTruthy();
  });

  it('e-mail: opcional, mas válido quando preenchido; normaliza', () => {
    expect(validarClienteAdmin({ ...minimo, email: 'x' }).campos.email).toBeTruthy();
    expect(validarClienteAdmin({ ...minimo, email: ' A@B.com ' }).valor.email).toBe('a@b.com');
  });

  it('observações até 1000 caracteres, preservando quebras de linha', () => {
    const longa = validarClienteAdmin({ ...minimo, observacoes: 'a'.repeat(1001) });
    expect(longa.campos.observacoes).toBeTruthy();
    expect(validarClienteAdmin({ ...minimo, observacoes: ' a\nb ' }).valor.observacoes).toBe(
      'a\nb',
    );
  });

  it('endereço opcional, validado quando preenchido', () => {
    const r = validarClienteAdmin({
      ...minimo,
      tipo_pessoa: 'PJ',
      razao_social: 'Loja Maria ME',
      telefone: '(81) 3333-4444',
      cep: '50000-000',
      uf: 'pe',
      nome_fantasia: 'Loja Maria',
    });
    expect(r.valor).toMatchObject({ telefone: '8133334444', cep: '50000000', uf: 'PE' });
    expect(r.valor.nome_fantasia).toBe('Loja Maria');
    const ruim = validarClienteAdmin({ ...minimo, telefone: '1', cep: '2', uf: 'ZZ' });
    expect(Object.keys(ruim.campos).sort()).toEqual(['cep', 'telefone', 'uf']);
  });

  it('parcial: valida só o que veio e não exige o resto', () => {
    expect(validarClienteAdmin({ telefone: '81999990000' }, { parcial: true })).toEqual({
      ok: true,
      valor: { telefone: '81999990000' },
    });
    expect(validarClienteAdmin({ nome: '' }, { parcial: true }).campos.nome).toBeTruthy();
    expect(validarClienteAdmin({ cpf_cnpj: '' }, { parcial: true }).valor.cpf_cnpj).toBeNull();
    expect(validarClienteAdmin({ cpf_cnpj: '12' }, { parcial: true }).campos.cpf_cnpj).toBeTruthy();
    expect(validarClienteAdmin({ cpf_cnpj: CNPJ }, { parcial: true }).ok).toBe(true);
  });

  it('parcial: PJ com razão social em branco é erro; PF zera a razão social', () => {
    const pjVazio = validarClienteAdmin({ tipo_pessoa: 'PJ', razao_social: '' }, { parcial: true });
    expect(pjVazio.campos.razao_social).toBeTruthy();
    const pfParcial = validarClienteAdmin({ tipo_pessoa: 'PF' }, { parcial: true });
    expect(pfParcial.valor.razao_social).toBeNull();
  });
});

describe('resumoCliente e perfilCliente com ficha incompleta', () => {
  it('documento, telefone e contatos ausentes ficam null; telefone sai formatado', () => {
    const ficha = {
      id: 'x',
      tipo_pessoa: 'PF',
      nome: 'N',
      cpf_cnpj: null,
      telefone: '81988887777',
    };
    expect(resumoCliente(ficha)).toEqual({
      id: 'x',
      tipo_pessoa: 'PF',
      nome: 'N',
      razao_social: null,
      nome_fantasia: null,
      cpf_cnpj: null,
      telefone: '(81) 98888-7777',
      email: null,
      cidade: null,
      uf: null,
    });
    expect(perfilCliente(ficha).cpf_cnpj).toBeNull();
  });
});

describe('validarEdicaoFicha (cruza com o tipo guardado)', () => {
  const pfSemDoc = { tipo_pessoa: 'PF', cpf_cnpj: null, razao_social: null };

  it('sem tipo no envio: documento precisa casar com o tipo guardado', () => {
    expect(validarEdicaoFicha({ cpf_cnpj: CNPJ }, pf).campos.cpf_cnpj).toBeTruthy();
    expect(validarEdicaoFicha({ cpf_cnpj: CPF }, pj).campos.cpf_cnpj).toBeTruthy();
    expect(validarEdicaoFicha({ cpf_cnpj: CPF }, pf)).toEqual({
      ok: true,
      valor: { cpf_cnpj: CPF },
    });
  });
  it('documento vazio vira null e é aceito', () => {
    expect(validarEdicaoFicha({ cpf_cnpj: '' }, pf)).toEqual({
      ok: true,
      valor: { cpf_cnpj: null },
    });
  });
  it('PJ não pode ficar sem razão social', () => {
    expect(validarEdicaoFicha({ razao_social: '' }, pj).campos.razao_social).toBeTruthy();
    expect(validarEdicaoFicha({ razao_social: ' Nova Ltda ' }, pj).valor).toEqual({
      razao_social: 'Nova Ltda',
    });
  });
  it('PF guardado ignora razão social enviada', () => {
    expect(validarEdicaoFicha({ razao_social: 'X' }, pf).valor.razao_social).toBeNull();
  });
  it('PF -> PJ exige razão social e CNPJ compatível com o que já existe', () => {
    expect(validarEdicaoFicha({ tipo_pessoa: 'PJ' }, pf).campos).toEqual({
      cpf_cnpj: expect.any(String),
      razao_social: expect.any(String),
    });
    expect(validarEdicaoFicha({ tipo_pessoa: 'PJ' }, pfSemDoc).campos).toEqual({
      razao_social: expect.any(String),
    });
    const ok = validarEdicaoFicha(
      { tipo_pessoa: 'PJ', razao_social: 'Nova Ltda', cpf_cnpj: CNPJ },
      pf,
    );
    expect(ok.ok).toBe(true);
  });
  it('PJ -> PF limpa razão social e nome fantasia', () => {
    const r = validarEdicaoFicha({ tipo_pessoa: 'PF', cpf_cnpj: CPF }, pj);
    expect(r).toEqual({
      ok: true,
      valor: { tipo_pessoa: 'PF', cpf_cnpj: CPF, razao_social: null, nome_fantasia: null },
    });
    expect(validarEdicaoFicha({ tipo_pessoa: 'PF' }, pj).campos.cpf_cnpj).toBeTruthy();
  });
});
