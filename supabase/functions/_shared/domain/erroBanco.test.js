import { describe, expect, it } from 'vitest';
import { traduzirErroBanco, violouUnicidade } from './erroBanco.js';

describe('traduzirErroBanco', () => {
  it('check violation (23514) vira 400', () => {
    const r = traduzirErroBanco({ code: '23514', message: 'new row violates check constraint' });
    expect(r.status).toBe(400);
    expect(r.erro).toMatch(/não são válidos/);
  });
  it('texto inválido (22P02) vira 400', () => {
    const r = traduzirErroBanco({ code: '22P02', message: 'invalid input syntax for type uuid' });
    expect(r.status).toBe(400);
    expect(r.erro).toMatch(/formato inválido/);
  });
  it('outros erros e vazio não são traduzidos', () => {
    expect(traduzirErroBanco({ code: '42P01' })).toBeNull();
    expect(traduzirErroBanco(null)).toBeNull();
  });
});

describe('violouUnicidade', () => {
  const erro = {
    code: '23505',
    message: 'duplicate key value violates unique constraint "clientes_cpf_cnpj_key"',
  };
  it('reconhece a constraint pelo nome', () => {
    expect(violouUnicidade(erro, 'clientes_cpf_cnpj_key')).toBe(true);
    expect(violouUnicidade(erro, 'outra_key')).toBe(false);
  });
  it('exige o código 23505', () => {
    expect(violouUnicidade({ ...erro, code: '23514' }, 'clientes_cpf_cnpj_key')).toBe(false);
    expect(violouUnicidade(undefined, 'x')).toBe(false);
  });
});
