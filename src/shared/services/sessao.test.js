import { beforeEach, describe, expect, it, vi } from 'vitest';
import { criarSessao } from './sessao.js';

const CHAVE = 'reserva.teste';
const SESSAO = { access_token: 'a', refresh_token: 'r', expires_at: 123 };
const USUARIO = { id: 'u1', email: 'a@b.com', nome: 'Ana', papel: 'cliente' };

describe('criarSessao', () => {
  beforeEach(() => window.localStorage.clear());

  it('salva e obtém sessão e usuário', () => {
    const sessao = criarSessao(CHAVE);
    expect(sessao.obter()).toBeNull();
    sessao.salvar(SESSAO, USUARIO);
    expect(sessao.obter()).toEqual({ sessao: SESSAO, usuario: USUARIO });
  });

  it('atualizarSessao troca só a sessão', () => {
    const sessao = criarSessao(CHAVE);
    sessao.salvar(SESSAO, USUARIO);
    sessao.atualizarSessao({ ...SESSAO, access_token: 'novo' });
    expect(sessao.obter().sessao.access_token).toBe('novo');
    expect(sessao.obter().usuario).toEqual(USUARIO);
  });

  it('limpar remove e avisa os assinantes; cancelar assinatura para os avisos', () => {
    const sessao = criarSessao(CHAVE);
    const ouvinte = vi.fn();
    const cancelar = sessao.assinar(ouvinte);
    sessao.salvar(SESSAO, USUARIO);
    sessao.limpar();
    expect(ouvinte).toHaveBeenLastCalledWith(null);
    cancelar();
    ouvinte.mockClear();
    sessao.salvar(SESSAO, USUARIO);
    expect(ouvinte).not.toHaveBeenCalled();
  });

  it.each([
    ['JSON inválido', '{ruim'],
    ['formato errado', JSON.stringify({ sessao: { access_token: 1 }, usuario: USUARIO })],
    ['sem usuário', JSON.stringify({ sessao: SESSAO })],
    ['valor primitivo', '42'],
  ])('sessão corrompida (%s) vale como deslogado e é removida', (_nome, bruto) => {
    window.localStorage.setItem(CHAVE, bruto);
    expect(criarSessao(CHAVE).obter()).toBeNull();
    expect(window.localStorage.getItem(CHAVE)).toBeNull();
  });

  it('propaga logout feito em outra aba (evento storage)', () => {
    const sessao = criarSessao(CHAVE);
    sessao.salvar(SESSAO, USUARIO);
    const ouvinte = vi.fn();
    sessao.assinar(ouvinte);
    window.localStorage.removeItem(CHAVE);
    window.dispatchEvent(new StorageEvent('storage', { key: CHAVE }));
    expect(ouvinte).toHaveBeenCalledWith(null);
  });
});
