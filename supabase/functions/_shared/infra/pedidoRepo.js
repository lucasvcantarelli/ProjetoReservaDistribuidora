import { db } from './db.js';
import { falhar } from './http.js';
import { revisarItens, validarItensCarrinho } from '../domain/pedido.js';

const COLUNAS_VARIACAO =
  'id, nome_tamanho, ativo, vende_unidade, preco_unidade_centavos, vende_fardo, qtd_por_fardo, preco_fardo_centavos, produto:produtos(nome, ativo)';

function objetoOuVazio(valor) {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor) ? valor : {};
}

// Valida o carrinho recebido e o confere contra o banco (uma única consulta por id).
export async function revisarCarrinho({ itens, precos_vistos }) {
  const validacao = validarItensCarrinho(itens);
  if (!validacao.ok) falhar(400, validacao.erro);
  const ids = [...new Set(validacao.itens.map((i) => i.variacao_id))];
  const { data, error } = await db()
    .from('produto_variacoes')
    .select(COLUNAS_VARIACAO)
    .in('id', ids);
  if (error) throw new Error(error.message);
  return revisarItens(validacao.itens, data, objetoOuVazio(precos_vistos));
}
