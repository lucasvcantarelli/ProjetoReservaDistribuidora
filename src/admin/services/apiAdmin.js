import { criarApi } from '../../shared/services/api.js';
import { criarSessao } from '../../shared/services/sessao.js';

export const CHAVE_SESSAO_ADMIN = 'reserva.admin.sessao';

// Sessão do painel: chave própria, separada da do cliente da loja.
export const sessaoAdmin = criarSessao(CHAVE_SESSAO_ADMIN);
export const apiAdmin = criarApi(sessaoAdmin);
