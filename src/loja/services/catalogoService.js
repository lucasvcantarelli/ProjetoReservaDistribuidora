import { apiLoja } from './apiLoja.js';

const FUNCAO = 'catalogo';

export const TAMANHO_PAGINA = 24;

// Camada de acesso ao catálogo público (não exige login).
export const catalogoService = {
  categorias() {
    return apiLoja.chamar(FUNCAO, { acao: 'categorias' });
  },

  // -> { itens: [{ id, nome, foto_url, a_partir_de_centavos }], total }
  produtos({ categoriaSlug, busca, pagina = 1 } = {}) {
    return apiLoja.chamar(FUNCAO, {
      acao: 'produtos',
      categoria_slug: categoriaSlug || undefined,
      busca: busca || undefined,
      pagina,
    });
  },

  // -> { id, nome, descricao, categoria, fotos: [url], variacoes: [...] }
  produto(id) {
    return apiLoja.chamar(FUNCAO, { acao: 'produto', id });
  },
};
