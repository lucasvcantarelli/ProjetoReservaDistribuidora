import { apiAdmin } from './apiAdmin.js';

const FUNCAO = 'admin-fotos';
const NOME_ARQUIVO = 'foto';

function chamar(acao, dados) {
  return apiAdmin.chamar(FUNCAO, { acao, ...dados }, { autenticado: true });
}

// Fotos de um produto: { id, produto_id, ordem, url }.
export const fotosService = {
  // `arquivo`: Blob já comprimido (multipart: campos `produto_id` e `arquivo`) -> foto criada
  enviar(produtoId, arquivo) {
    const formData = new FormData();
    formData.append('produto_id', produtoId);
    formData.append('arquivo', arquivo, NOME_ARQUIVO);
    return apiAdmin.chamar(FUNCAO, undefined, { autenticado: true, formData });
  },

  remover(id) {
    return chamar('remover', { id });
  },

  // ids: todas as fotos do produto na nova ordem -> lista reordenada
  reordenar(produtoId, ids) {
    return chamar('reordenar', { produto_id: produtoId, ids });
  },
};
