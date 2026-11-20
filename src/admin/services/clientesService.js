import { apiAdmin } from './apiAdmin.js';

const FUNCAO = 'admin-clientes';

function chamar(acao, dados = {}) {
  return apiAdmin.chamar(FUNCAO, { acao, ...dados }, { autenticado: true });
}

export const TAMANHO_PAGINA = 24;

// Cadastro interno de clientes da empresa (sem conta nem acesso ao site). O documento já vem
// formatado (CPF 000.000.000-00 / CNPJ 00.000.000/0000-00); documento, telefone e e-mail são opcionais.
export const clientesService = {
  // -> { itens: [{ id, tipo_pessoa, nome, razao_social, nome_fantasia, cpf_cnpj, telefone, email,
  //    cidade, uf }], total }
  listar({ busca, pagina = 1 } = {}) {
    return chamar('listar', { busca: busca || undefined, pagina });
  },

  // -> ficha completa: listar + cep, rua, numero, complemento, bairro, observacoes, criado_em,
  // atualizado_em
  obter(id) {
    return chamar('obter', { id });
  },

  // `dados`: a ficha inteira. Erro 409 de documento duplicado traz `campos.cpf_cnpj`. -> ficha criada
  criar(dados) {
    return chamar('criar', { dados });
  },

  // `dados`: campos da ficha. Erro 409 de documento duplicado traz `campos.cpf_cnpj`.
  // -> ficha atualizada
  editar(id, dados) {
    return chamar('editar', { id, dados });
  },

  excluir(id) {
    return chamar('excluir', { id });
  },
};
