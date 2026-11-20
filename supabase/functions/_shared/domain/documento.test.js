import { describe, expect, it } from 'vitest';
import {
  cnpjValido,
  cpfValido,
  formatarCnpj,
  formatarCpf,
  formatarDocumento,
  formatarTelefone,
  somenteDigitos,
} from './documento.js';

describe('formatarCpf e formatarDocumento', () => {
  it('formata CPF com e sem máscara; tamanho errado devolve só dígitos', () => {
    expect(formatarCpf('52998224725')).toBe('529.982.247-25');
    expect(formatarCpf('529.982.247-25')).toBe('529.982.247-25');
    expect(formatarCpf('123')).toBe('123');
  });

  it('formatarDocumento escolhe pela pessoa', () => {
    expect(formatarDocumento('52998224725', 'PF')).toBe('529.982.247-25');
    expect(formatarDocumento('12345678000190', 'PJ')).toBe('12.345.678/0001-90');
  });
});

describe('somenteDigitos', () => {
  it('remove tudo que não é dígito', () => {
    expect(somenteDigitos('529.982.247-25')).toBe('52998224725');
    expect(somenteDigitos(' (81) 99999-0000 ')).toBe('81999990000');
  });

  it('tolera valores não textuais', () => {
    expect(somenteDigitos(undefined)).toBe('');
    expect(somenteDigitos(null)).toBe('');
    expect(somenteDigitos(12345)).toBe('12345');
  });
});

describe('cpfValido', () => {
  it('aceita CPF válido com ou sem máscara', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('52998224725')).toBe(true);
  });

  it('rejeita sequências repetidas', () => {
    expect(cpfValido('111.111.111-11')).toBe(false);
    expect(cpfValido('00000000000')).toBe(false);
  });

  it('rejeita dígito verificador errado e tamanho errado', () => {
    expect(cpfValido('529.982.247-26')).toBe(false);
    expect(cpfValido('5299822472')).toBe(false);
    expect(cpfValido('')).toBe(false);
    expect(cpfValido(undefined)).toBe(false);
  });
});

describe('cnpjValido', () => {
  it('aceita CNPJ válido com ou sem máscara', () => {
    expect(cnpjValido('11.222.333/0001-81')).toBe(true);
    expect(cnpjValido('11222333000181')).toBe(true);
  });

  it('rejeita dígito verificador errado, repetidos e tamanho errado', () => {
    expect(cnpjValido('11222333000180')).toBe(false);
    expect(cnpjValido('11111111111111')).toBe(false);
    expect(cnpjValido('1122233300018')).toBe(false);
    expect(cnpjValido(null)).toBe(false);
  });
});

describe('formatarCnpj', () => {
  it('aplica a máscara', () => {
    expect(formatarCnpj('12345678000190')).toBe('12.345.678/0001-90');
  });

  it('aceita entrada já mascarada', () => {
    expect(formatarCnpj('12.345.678/0001-90')).toBe('12.345.678/0001-90');
  });
});

describe('formatarTelefone', () => {
  it('formata 10 e 11 dígitos; outro tamanho volta aparado', () => {
    expect(formatarTelefone('81988887777')).toBe('(81) 98888-7777');
    expect(formatarTelefone('(81) 3333-4444')).toBe('(81) 3333-4444');
    expect(formatarTelefone(' 123 ')).toBe('123');
    expect(formatarTelefone(null)).toBe('');
  });
});
