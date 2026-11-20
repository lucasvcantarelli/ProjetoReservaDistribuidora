import { apiAdmin } from './apiAdmin.js';

const FUNCAO = 'admin-categorias';

function chamar(acao, dados = {}) {
  return apiAdmin.chamar(FUNCAO, { acao, ...dados }, { autenticado: true });
}

// Categorias do painel: { id, nome, slug, ordem, ativo }.
export const categoriasService = {
  // -> categorias em ordem
  listar() {
    return chamar('listar');
  },

  // -> categoria criada (sempre ativa, no fim da ordem)
  criar({ nome }) {
    return chamar('criar', { nome });
  },

  // alteracoes: { nome?, ativo? } -> categoria atualizada
  editar(id, alteracoes) {
    return chamar('editar', { id, ...alteracoes });
  },

  // 409 se a categoria tiver produtos
  excluir(id) {
    return chamar('excluir', { id });
  },

  // ids: todos os ids na nova ordem -> lista reordenada
  reordenar(ids) {
    return chamar('reordenar', { ids });
  },
};
