import { storage } from './storage.js';

function sessaoValida(sessao) {
  return (
    !!sessao &&
    typeof sessao.access_token === 'string' &&
    typeof sessao.refresh_token === 'string' &&
    typeof sessao.expires_at === 'number'
  );
}

function usuarioValido(usuario) {
  return (
    !!usuario &&
    typeof usuario.id === 'string' &&
    typeof usuario.email === 'string' &&
    typeof usuario.nome === 'string' &&
    typeof usuario.papel === 'string'
  );
}

// Guarda { sessao, usuario } numa chave do localStorage e avisa quem assinou (inclusive outras abas).
export function criarSessao(chave) {
  const ouvintes = new Set();

  function obter() {
    const guardado = storage.ler(chave, null);
    if (!sessaoValida(guardado?.sessao) || !usuarioValido(guardado?.usuario)) {
      storage.remover(chave); // ausente ou corrompido: vale como deslogado
      return null;
    }
    return { sessao: guardado.sessao, usuario: guardado.usuario };
  }

  function avisar() {
    const atual = obter();
    ouvintes.forEach((ouvinte) => ouvinte(atual));
  }

  function salvar(sessao, usuario) {
    storage.gravar(chave, { sessao, usuario });
    avisar();
  }

  function atualizarSessao(sessao) {
    const atual = obter();
    if (atual) salvar(sessao, atual.usuario);
  }

  function limpar() {
    storage.remover(chave);
    avisar();
  }

  function assinar(ouvinte) {
    ouvintes.add(ouvinte);
    return () => ouvintes.delete(ouvinte);
  }

  window.addEventListener('storage', (evento) => {
    if (evento.key === chave || evento.key === null) avisar();
  });

  return { obter, salvar, atualizarSessao, limpar, assinar };
}
