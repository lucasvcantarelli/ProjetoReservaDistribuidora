import { describe, expect, it } from 'vitest';
import {
  ehAndroid,
  formatarWhatsappCompleto,
  linksPorAplicativo,
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

describe('escolha do aplicativo no Android', () => {
  const LINK = 'https://wa.me/5581999990000?text=Pedido%20%26%20caf%C3%A9';
  const voltar = encodeURIComponent(LINK);

  it('gera um link para o WhatsApp e outro para o WhatsApp Business, com volta ao wa.me', () => {
    expect(linksPorAplicativo(LINK)).toEqual({
      whatsapp:
        'intent://send/?phone=5581999990000&text=Pedido%20%26%20caf%C3%A9' +
        `#Intent;scheme=whatsapp;package=com.whatsapp;S.browser_fallback_url=${voltar};end`,
      business:
        'intent://send/?phone=5581999990000&text=Pedido%20%26%20caf%C3%A9' +
        `#Intent;scheme=whatsapp;package=com.whatsapp.w4b;S.browser_fallback_url=${voltar};end`,
    });
  });

  it('sem texto também funciona', () => {
    expect(
      linksPorAplicativo('https://wa.me/5581999990000').whatsapp.startsWith(
        'intent://send/?phone=5581999990000&text=#Intent;',
      ),
    ).toBe(true);
  });

  it.each(['', 'https://example.com/5581999990000?text=x', 'https://wa.me/abc?text=x', null])(
    'link que não é wa.me (%s) -> null',
    (link) => expect(linksPorAplicativo(link)).toBeNull(),
  );

  it.each([
    ['Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 Chrome/131 Mobile', true],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15', false],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131', false],
    // Navegadores dentro de apps (WebView, Instagram, Facebook) não abrem intent: botão único.
    ['Mozilla/5.0 (Linux; Android 14; SM-A546E; wv) AppleWebKit/537.36 Chrome/131 Mobile', false],
    ['Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131 Mobile Instagram 350.0', false],
    [
      'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131 Mobile [FBAN/EMA;FBAV/400.0]',
      false,
    ],
  ])('ehAndroid(%s) = %s', (ua, esperado) => expect(ehAndroid(ua)).toBe(esperado));
});
