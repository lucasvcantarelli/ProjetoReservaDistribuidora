import { describe, expect, it } from 'vitest';
import { formatarInteiro, formatarReais } from './dinheiro.js';

describe('formatarReais', () => {
  it.each([
    [0, 'R$ 0,00'],
    [5, 'R$ 0,05'],
    [50, 'R$ 0,50'],
    [8500, 'R$ 85,00'],
    [123456, 'R$ 1.234,56'],
    [100000000, 'R$ 1.000.000,00'],
    [-150, '-R$ 1,50'],
  ])('%i centavos -> %s', (centavos, esperado) => {
    expect(formatarReais(centavos)).toBe(esperado);
  });

  it('trata valor inválido como zero', () => {
    expect(formatarReais(undefined)).toBe('R$ 0,00');
    expect(formatarReais(NaN)).toBe('R$ 0,00');
  });
});

describe('formatarInteiro', () => {
  it('usa ponto como separador de milhar', () => {
    expect(formatarInteiro(1000)).toBe('1.000');
    expect(formatarInteiro(999)).toBe('999');
    expect(formatarInteiro(1234567)).toBe('1.234.567');
  });
});
