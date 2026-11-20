import { formatarInteiro } from '../../shared/utils/formatar.js';
import {
  FORMA_FARDO,
  FORMA_UNIDADE,
  QUANTIDADE_MAXIMA,
  QUANTIDADE_MINIMA,
} from '../../../supabase/functions/_shared/domain/pedido.js';

export { QUANTIDADE_MAXIMA, QUANTIDADE_MINIMA, FORMA_FARDO, FORMA_UNIDADE };

export function precoDaForma(variacao, forma) {
  const preco =
    forma === FORMA_FARDO ? variacao.preco_fardo_centavos : variacao.preco_unidade_centavos;
  return Number.isInteger(preco) && preco > 0 ? preco : null;
}

function vendidaNaForma(variacao, forma) {
  const vende = forma === FORMA_FARDO ? variacao.vende_fardo : variacao.vende_unidade;
  return !!vende && precoDaForma(variacao, forma) !== null;
}

// Formas (unidade/fardo) que a variação realmente vende, com preço válido.
export function formasDaVariacao(variacao) {
  return [FORMA_UNIDADE, FORMA_FARDO].filter((forma) => vendidaNaForma(variacao, forma));
}

export function rotuloDaForma(forma, variacao) {
  if (forma === FORMA_FARDO) return `Fardo com ${formatarInteiro(variacao.qtd_por_fardo)} un.`;
  return 'Unidade';
}

export function limitarQuantidade(valor) {
  return Math.min(QUANTIDADE_MAXIMA, Math.max(QUANTIDADE_MINIMA, Math.trunc(valor)));
}

export function montarItemCarrinho(produto, variacao, forma, quantidade) {
  const item = {
    variacao_id: variacao.id,
    forma,
    quantidade,
    produto_id: produto.id,
    produto_nome: produto.nome,
    nome_tamanho: variacao.nome_tamanho,
    preco_centavos: precoDaForma(variacao, forma),
    foto_url: produto.fotos[0] ?? null,
  };
  if (forma === FORMA_FARDO) item.qtd_por_fardo = variacao.qtd_por_fardo;
  return item;
}

export function subtotalDoItem(item) {
  return item.preco_centavos * item.quantidade;
}

export function totalDoCarrinho(itens) {
  return itens.reduce((soma, item) => soma + subtotalDoItem(item), 0);
}
