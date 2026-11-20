import { describe, expect, it } from 'vitest';
import { validarConfig } from './configEmpresa.js';

const CNPJ_VALIDO = '11222333000181';

describe('validarConfig', () => {
  it('normaliza WhatsApp com máscara e sem DDI', () => {
    expect(validarConfig({ whatsapp: '(81) 99999-0000' }).valor.whatsapp).toBe('5581999990000');
    expect(validarConfig({ whatsapp: '(81) 3333-0000' }).valor.whatsapp).toBe('558133330000');
  });
  it('aceita WhatsApp já com 55', () => {
    expect(validarConfig({ whatsapp: '+55 81 99999-0000' }).valor.whatsapp).toBe('5581999990000');
  });
  it('rejeita WhatsApp curto, longo ou com DDI diferente de 55', () => {
    for (const ruim of ['(81) 9999', '12345678901234', '4412999990000', 'abc']) {
      expect(validarConfig({ whatsapp: ruim }).campos.whatsapp).toBeTruthy();
    }
  });
  it('WhatsApp vazio limpa o campo', () => {
    expect(validarConfig({ whatsapp: '' }).valor.whatsapp).toBeNull();
  });
  it('CNPJ: vazio vira null, válido vira dígitos, inválido é erro', () => {
    expect(validarConfig({ cnpj: '' }).valor.cnpj).toBeNull();
    expect(validarConfig({ cnpj: '11.222.333/0001-81' }).valor.cnpj).toBe(CNPJ_VALIDO);
    expect(validarConfig({ cnpj: '11.222.333/0001-80' }).campos.cnpj).toBeTruthy();
  });
  it('e-mail de privacidade: vazio vira null; válido em minúsculas; inválido dá erro', () => {
    expect(validarConfig({ email_privacidade: '  ' }).valor.email_privacidade).toBeNull();
    expect(validarConfig({ email_privacidade: ' DPO@Loja.com ' }).valor.email_privacidade).toBe(
      'dpo@loja.com',
    );
    expect(
      validarConfig({ email_privacidade: 'sem-arroba' }).campos.email_privacidade,
    ).toBeTruthy();
  });
  it('nome é obrigatório e os textos têm limite', () => {
    expect(validarConfig({ nome: '  ' }).campos.nome).toBeTruthy();
    expect(validarConfig({ nome: 'x'.repeat(121) }).campos.nome).toMatch(/120/);
    expect(validarConfig({ endereco: 'x'.repeat(301) }).campos.endereco).toMatch(/300/);
    expect(validarConfig({ rodape_mensagem: 'x'.repeat(501) }).campos.rodape_mensagem).toMatch(
      /500/,
    );
  });
  it('apara textos e ignora campos desconhecidos ou ausentes', () => {
    const r = validarConfig({ nome: ' Loja ', logo_caminho: 'x', id: 2 });
    expect(r).toEqual({ ok: true, valor: { nome: 'Loja' } });
  });
  it('entrada que não é objeto resulta em nada para alterar', () => {
    expect(validarConfig(null)).toEqual({ ok: true, valor: {} });
  });
});
