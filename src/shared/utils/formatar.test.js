import { describe, expect, it } from 'vitest';
import {
  cpfValido,
  formatarCep,
  formatarReais,
  formatarTelefone,
  mascararDocumento,
  reaisParaCentavos,
} from './formatar.js';

describe('formatarTelefone com DDI', () => {
  it('descarta o 55 de um número colado com DDI', () => {
    expect(formatarTelefone('+55 (11) 98765-4321', { colado: true })).toBe('(11) 98765-4321');
    expect(formatarTelefone('551132654321', { colado: true })).toBe('(11) 3265-4321');
  });

  it('não mexe em DDD 55 digitado normalmente', () => {
    expect(formatarTelefone('55987654321')).toBe('(55) 98765-4321');
  });

  it('digitar um 12º dígito num número de DDD 55 não reembaralha o número', () => {
    expect(formatarTelefone('(55) 98765-4321')).toBe('(55) 98765-4321');
    expect(formatarTelefone('(55) 98765-43215')).toBe('(55) 98765-4321');
  });
});

describe('mascararDocumento', () => {
  it('aplica a máscara de CPF aos poucos e limita a 11 dígitos', () => {
    expect(mascararDocumento('5299', 'PF')).toBe('529.9');
    expect(mascararDocumento('52998224725999', 'PF')).toBe('529.982.247-25');
  });

  it('aplica a máscara de CNPJ aos poucos e limita a 14 dígitos', () => {
    expect(mascararDocumento('112223', 'PJ')).toBe('11.222.3');
    expect(mascararDocumento('11222333000181999', 'PJ')).toBe('11.222.333/0001-81');
  });
});

describe('reaisParaCentavos', () => {
  it.each([
    ['1.234,56', 123456],
    ['10', 1000],
    ['10,5', 1050],
    ['10,50', 1050],
    ['R$ 10,50', 1050],
    ['0,99', 99],
    ['1.000', 100000],
  ])('%s -> %s', (entrada, esperado) => {
    expect(reaisParaCentavos(entrada)).toBe(esperado);
  });

  it.each(['', 'abc', '10,555', '-5', '1,2,3', '1.23', null, undefined])(
    'inválido %s -> null',
    (entrada) => {
      expect(reaisParaCentavos(entrada)).toBeNull();
    },
  );
});

describe('formatarTelefone / formatarCep', () => {
  it('formata celular e fixo, inclusive parcial', () => {
    expect(formatarTelefone('11912345678')).toBe('(11) 91234-5678');
    expect(formatarTelefone('1123456789')).toBe('(11) 2345-6789');
    expect(formatarTelefone('119')).toBe('(11) 9');
    expect(formatarTelefone('1')).toBe('1');
    expect(formatarTelefone('')).toBe('');
  });

  it('formata CEP', () => {
    expect(formatarCep('01310100')).toBe('01310-100');
    expect(formatarCep('0131')).toBe('0131');
  });
});

describe('reexportações do domínio', () => {
  it('formatarReais e cpfValido vêm de supabase/functions/_shared/domain', () => {
    expect(formatarReais(123456)).toBe('R$ 1.234,56');
    expect(cpfValido('529.982.247-25')).toBe(true);
  });
});
