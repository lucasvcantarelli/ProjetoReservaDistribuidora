import { describe, expect, it } from 'vitest';
import { nomePrincipalCliente } from './clienteNome.js';

describe('nomePrincipalCliente', () => {
  it('empresa usa razão social, depois nome fantasia, depois o responsável', () => {
    const base = { tipo_pessoa: 'PJ', nome: 'João', razao_social: null, nome_fantasia: null };
    expect(nomePrincipalCliente({ ...base, razao_social: 'Bar LTDA', nome_fantasia: 'Bar' })).toBe(
      'Bar LTDA',
    );
    expect(nomePrincipalCliente({ ...base, nome_fantasia: 'Bar' })).toBe('Bar');
    expect(nomePrincipalCliente(base)).toBe('João');
  });
  it('pessoa física usa o nome', () => {
    expect(nomePrincipalCliente({ tipo_pessoa: 'PF', nome: 'Maria', razao_social: null })).toBe(
      'Maria',
    );
  });
});
