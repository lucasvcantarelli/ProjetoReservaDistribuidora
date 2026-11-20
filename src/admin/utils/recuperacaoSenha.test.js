import { describe, expect, it } from 'vitest';
import { lerTokenDeRecuperacao } from './recuperacaoSenha.js';

describe('lerTokenDeRecuperacao', () => {
  it('lê o access_token de um link de recuperação', () => {
    expect(lerTokenDeRecuperacao('#access_token=abc.def.ghi&expires_in=3600&type=recovery')).toBe(
      'abc.def.ghi',
    );
  });

  it.each([
    ['vazio', ''],
    ['só o #', '#'],
    ['sem token', '#type=recovery'],
    ['token vazio', '#access_token=&type=recovery'],
    ['outro tipo (magiclink)', '#access_token=abc&type=magiclink'],
    ['sem tipo', '#access_token=abc'],
    ['link expirado', '#error=access_denied&error_code=otp_expired&type=recovery'],
  ])('devolve null: %s', (_rotulo, hash) => {
    expect(lerTokenDeRecuperacao(hash)).toBeNull();
  });

  it('funciona sem o # inicial e com valores codificados', () => {
    expect(lerTokenDeRecuperacao('access_token=a%2Bb&type=recovery')).toBe('a+b');
  });
});
