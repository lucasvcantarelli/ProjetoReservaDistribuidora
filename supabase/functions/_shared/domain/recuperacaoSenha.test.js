import { describe, expect, it } from 'vitest';
import { tokenDeRecuperacao } from './recuperacaoSenha.js';

const base64Url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const jwt = (payload) => `${base64Url({ alg: 'HS256' })}.${base64Url(payload)}.assinatura`;

describe('tokenDeRecuperacao', () => {
  it('aceita amr com method recovery', () => {
    const amr = [{ method: 'recovery', timestamp: 1 }];
    expect(tokenDeRecuperacao(jwt({ amr }))).toBe(true);
  });

  it('aceita recovery junto de outros métodos', () => {
    const amr = [{ method: 'password' }, { method: 'recovery' }];
    expect(tokenDeRecuperacao(jwt({ amr }))).toBe(true);
  });

  it('aceita otp (o que o GoTrue grava no link de recuperação)', () => {
    expect(tokenDeRecuperacao(jwt({ amr: [{ method: 'otp', timestamp: 1 }] }))).toBe(true);
  });

  it('recusa login comum (password) e outros métodos', () => {
    expect(tokenDeRecuperacao(jwt({ amr: [{ method: 'password' }] }))).toBe(false);
    expect(tokenDeRecuperacao(jwt({ amr: [{ method: 'oauth' }] }))).toBe(false);
    expect(tokenDeRecuperacao(jwt({ amr: [{ method: 'magiclink' }] }))).toBe(false);
  });

  it('recusa sem amr ou amr malformado', () => {
    expect(tokenDeRecuperacao(jwt({}))).toBe(false);
    expect(tokenDeRecuperacao(jwt({ amr: 'recovery' }))).toBe(false);
    expect(tokenDeRecuperacao(jwt({ amr: [null, 'recovery'] }))).toBe(false);
  });

  it('recusa token malformado ou de tipo errado', () => {
    expect(tokenDeRecuperacao('x.y.z')).toBe(false);
    expect(tokenDeRecuperacao('abc')).toBe(false);
    expect(tokenDeRecuperacao('a.%%%.c')).toBe(false);
    expect(tokenDeRecuperacao(`a.${Buffer.from('[1]').toString('base64url')}.c`)).toBe(false);
    expect(tokenDeRecuperacao('')).toBe(false);
    expect(tokenDeRecuperacao(null)).toBe(false);
    expect(tokenDeRecuperacao(undefined)).toBe(false);
  });
});
