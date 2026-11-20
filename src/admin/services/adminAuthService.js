import { apiAdmin } from './apiAdmin.js';

const PAINEL_ADMIN = 'admin';

// Camada de acesso à autenticação do painel. A sessão local fica por conta do SessaoAdminContext.
export const adminAuthService = {
  // -> { sessao, usuario }
  entrar({ email, senha }) {
    return apiAdmin.chamar('auth-login', { email, senha, painel: PAINEL_ADMIN });
  },

  // -> mensagem neutra do servidor (a resposta é a mesma exista o e-mail ou não)
  recuperarSenha({ email }) {
    return apiAdmin.chamar('auth-recuperar-senha', { email });
  },

  // `accessToken` vem do link do e-mail de recuperação.
  definirNovaSenha({ accessToken, senha }) {
    return apiAdmin.chamar('auth-nova-senha', { access_token: accessToken, senha });
  },

  sair() {
    return apiAdmin.chamar('auth-logout', {}, { autenticado: true });
  },
};
