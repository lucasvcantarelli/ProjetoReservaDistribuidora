import { describe, expect, it } from 'vitest';
import { servicoIndisponivel } from './erroAuth.js';

describe('servicoIndisponivel', () => {
  it('429 e códigos de limite são indisponibilidade', () => {
    expect(servicoIndisponivel({ status: 429 })).toBe(true);
    expect(servicoIndisponivel({ code: 'over_request_rate_limit' })).toBe(true);
    expect(servicoIndisponivel({ code: 'over_email_send_rate_limit', status: 400 })).toBe(true);
  });

  it('5xx e falha de rede (status 0) são indisponibilidade', () => {
    expect(servicoIndisponivel({ status: 500 })).toBe(true);
    expect(servicoIndisponivel({ status: 503 })).toBe(true);
    expect(servicoIndisponivel({ status: 0 })).toBe(true);
  });

  it('credenciais inválidas e erros 4xx comuns não são', () => {
    expect(servicoIndisponivel({ status: 400, code: 'invalid_credentials' })).toBe(false);
    expect(servicoIndisponivel({ status: 401 })).toBe(false);
    expect(servicoIndisponivel({ status: 422 })).toBe(false);
  });

  it('sem erro ou sem status não é', () => {
    expect(servicoIndisponivel(null)).toBe(false);
    expect(servicoIndisponivel(undefined)).toBe(false);
    expect(servicoIndisponivel({ message: 'x' })).toBe(false);
  });
});
