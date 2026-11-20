import { describe, expect, it } from 'vitest';
import { caminhoDeLogin, destinoSeguro } from './redirecionamento.js';

describe('destinoSeguro (proteção contra open redirect)', () => {
  it('aceita caminhos relativos do app', () => {
    expect(destinoSeguro('/finalizar')).toBe('/finalizar');
    expect(destinoSeguro('/produto/1?x=2')).toBe('/produto/1?x=2');
  });

  it.each([
    'https://mal.com',
    '//mal.com',
    '/\\mal.com',
    '/a\\b',
    '/\t/mal.com',
    '/\n/mal.com',
    '/x\u007f',
    'javascript:alert(1)',
    'finalizar',
    '',
    null,
    undefined,
  ])('rejeita %s e volta ao início', (voltar) => {
    expect(destinoSeguro(voltar)).toBe('/');
  });
});

describe('caminhoDeLogin', () => {
  it('mantém a barra legível e codifica o resto', () => {
    expect(caminhoDeLogin('/finalizar')).toBe('/entrar?voltar=/finalizar');
    expect(caminhoDeLogin('/a?b=1&c=2')).toBe('/entrar?voltar=/a%3Fb%3D1%26c%3D2');
  });
});
