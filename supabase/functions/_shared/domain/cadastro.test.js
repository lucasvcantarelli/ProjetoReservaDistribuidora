import { describe, expect, it } from 'vitest';
import {
  TAMANHO_MAXIMO,
  textoUmaLinha,
  validarCep,
  validarEmail,
  validarSenha,
  validarTelefone,
  validarTextoLivre,
  validarTipoPessoa,
  validarUf,
} from './cadastro.js';

describe('textoUmaLinha', () => {
  it('troca quebras de linha, tabs e espaços repetidos por um espaço', () => {
    expect(textoUmaLinha('  Rua\nA\t\t  B ')).toBe('Rua A B');
  });
  it('valor não textual vira vazio', () => {
    expect(textoUmaLinha(123)).toBe('');
    expect(textoUmaLinha(null)).toBe('');
  });
});

describe('validarTextoLivre', () => {
  it('obrigatório vazio dá erro; opcional vazio dá string vazia', () => {
    expect(validarTextoLivre('nome', { obrigatorio: true })('  ').erro).toBe('Informe o nome.');
    expect(validarTextoLivre('complemento', { obrigatorio: false })('  ')).toEqual({ valor: '' });
  });
  it('apara, normaliza quebras e limita o tamanho', () => {
    const validar = validarTextoLivre('nome', { obrigatorio: true });
    expect(validar(' Maria\nSilva ')).toEqual({ valor: 'Maria Silva' });
    expect(validar('x'.repeat(TAMANHO_MAXIMO.nome + 1)).erro).toMatch(/no máximo/);
  });
});

describe('validadores de contato e endereço', () => {
  it('telefone: 10 ou 11 dígitos, devolve só dígitos', () => {
    expect(validarTelefone('(81) 99999-0000')).toEqual({ valor: '81999990000' });
    expect(validarTelefone('(81) 3333-4444')).toEqual({ valor: '8133334444' });
    expect(validarTelefone('999').erro).toBeTruthy();
  });
  it('e-mail: minúsculo e aparado; inválido dá erro', () => {
    expect(validarEmail('  Maria@Exemplo.COM ')).toEqual({ valor: 'maria@exemplo.com' });
    expect(validarEmail('sem-arroba').erro).toBeTruthy();
  });
  it('CEP: 8 dígitos', () => {
    expect(validarCep('50.000-000')).toEqual({ valor: '50000000' });
    expect(validarCep('123').erro).toBeTruthy();
  });
  it('UF: maiúscula e existente', () => {
    expect(validarUf(' pe ')).toEqual({ valor: 'PE' });
    expect(validarUf('XX').erro).toBeTruthy();
  });
  it('tipo de pessoa: PF ou PJ', () => {
    expect(validarTipoPessoa('pj')).toEqual({ valor: 'PJ' });
    expect(validarTipoPessoa('x').erro).toBeTruthy();
  });
});

describe('validarSenha', () => {
  it('rejeita senha curta, longa demais ou ausente', () => {
    expect(validarSenha('curta').erro).toMatch(/pelo menos 8/);
    expect(validarSenha('x'.repeat(73)).erro).toMatch(/no máximo 72/);
    expect(validarSenha(undefined).erro).toBeTruthy();
  });
  it('aceita senha dentro dos limites', () => {
    expect(validarSenha('segredo123')).toEqual({ valor: 'segredo123' });
  });
});
