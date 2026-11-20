import { describe, expect, it } from 'vitest';
import {
  formatarWhatsappCompleto,
  linkDeTeste,
  whatsappCompleto,
  whatsappParaCampo,
} from './whatsapp.js';

describe('whatsapp do painel', () => {
  it.each([
    ['8133334444', '+55 (81) 3333-4444'],
    ['81999990000', '+55 (81) 99999-0000'],
    ['5581999990000', '+55 (81) 99999-0000'],
    ['+55 (81) 99999-0000', '+55 (81) 99999-0000'],
    ['558133334444', '+55 (81) 3333-4444'],
  ])('formata %s como %s', (entrada, esperado) => {
    expect(formatarWhatsappCompleto(entrada)).toBe(esperado);
  });

  it.each(['', '81999', '819999900001', '4481999990000', 'abc'])(
    '%s é incompleto/inválido',
    (entrada) => {
      expect(whatsappCompleto(entrada)).toBeNull();
      expect(formatarWhatsappCompleto(entrada)).toBeNull();
      expect(linkDeTeste(entrada)).toBeNull();
    },
  );

  it('link de teste usa só dígitos com DDI', () => {
    expect(linkDeTeste('(81) 99999-0000')).toBe('https://wa.me/5581999990000');
  });

  it('número do servidor vira campo sem o DDI (inclusive com DDD 55)', () => {
    expect(whatsappParaCampo('5581999990000')).toBe('(81) 99999-0000');
    expect(whatsappParaCampo('5555999991234')).toBe('(55) 99999-1234');
    expect(whatsappParaCampo(null)).toBe('');
  });
});
