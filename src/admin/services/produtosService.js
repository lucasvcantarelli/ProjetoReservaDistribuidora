import { apiAdmin } from './apiAdmin.js';

const FUNCAO = 'admin-produtos';

function chamar(acao, dados = {}) {
  return apiAdmin.chamar(FUNCAO, { acao, ...dados }, { autenticado: true });
}

export const TAMANHO_PAGINA = 24;

// Produtos do painel (preços sempre em centavos inteiros).
export const produtosService = {
  // -> { itens: [{ id, nome, ativo, categoria_id, categoria_nome, foto_url, a_partir_de_centavos,
  //                total_variacoes }], total }
  listar({ busca, categoriaId, pagina = 1 } = {}) {
    return chamar('listar', {
      busca: busca || undefined,
      categoria_id: categoriaId || undefined,
      pagina,
    });
  },

  // -> { id, categoria_id, nome, descricao, ativo, fotos: [{ id, ordem, url }], variacoes: [...] }
  obter(id) {
    return chamar('obter', { id });
  },

  // { produto, variacoes } -> produto completo (mesmo formato de `obter`)
  criar({ produto, variacoes }) {
    return chamar('criar', { produto, variacoes });
  },

  // variações ausentes da lista são removidas -> produto completo
  editar(id, { produto, variacoes }) {
    return chamar('editar', { id, produto, variacoes });
  },

  // apaga também as fotos do Storage
  excluir(id) {
    return chamar('excluir', { id });
  },
};
