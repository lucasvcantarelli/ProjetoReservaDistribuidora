import { storage } from '../../shared/services/storage.js';
import {
  FORMA_FARDO,
  FORMA_UNIDADE,
  QUANTIDADE_MAXIMA,
  QUANTIDADE_MINIMA,
} from '../../../supabase/functions/_shared/domain/pedido.js';

export const CHAVE_CARRINHO = 'reserva.carrinho';

const FORMAS = [FORMA_UNIDADE, FORMA_FARDO];

const ehTexto = (v) => typeof v === 'string' && v.length > 0;
const ehInteiro = (v, minimo) => Number.isInteger(v) && v >= minimo;

export const chaveDoItem = (variacaoId, forma) => `${variacaoId}:${forma}`;

function itemValido(item) {
  if (!item || typeof item !== 'object') return false;
  const basico =
    ehTexto(item.variacao_id) &&
    ehTexto(item.produto_id) &&
    ehTexto(item.produto_nome) &&
    typeof item.nome_tamanho === 'string' &&
    FORMAS.includes(item.forma) &&
    ehInteiro(item.preco_centavos, 0) &&
    ehInteiro(item.quantidade, QUANTIDADE_MINIMA) &&
    item.quantidade <= QUANTIDADE_MAXIMA;
  if (!basico) return false;
  return item.forma !== FORMA_FARDO || ehInteiro(item.qtd_por_fardo, 1);
}

function normalizar(item) {
  return {
    ...item,
    chave: chaveDoItem(item.variacao_id, item.forma),
    foto_url: typeof item.foto_url === 'string' ? item.foto_url : null,
  };
}

function lerValidos() {
  const guardado = storage.ler(CHAVE_CARRINHO, []);
  if (!Array.isArray(guardado)) return [];
  return guardado.filter(itemValido).map(normalizar);
}

function gravar(itens) {
  storage.gravar(CHAVE_CARRINHO, itens);
  return itens;
}

// Carrinho no navegador. Conteúdo inválido é descartado item a item, sem quebrar.
export const carrinhoService = {
  ler: lerValidos,

  // Item já existente (mesma variação e forma) soma a quantidade, limitada ao máximo.
  adicionar(item) {
    const novo = normalizar(item);
    const itens = lerValidos();
    const existente = itens.find((i) => i.chave === novo.chave);
    if (existente) {
      existente.quantidade = Math.min(existente.quantidade + novo.quantidade, QUANTIDADE_MAXIMA);
    } else {
      itens.push({ ...novo, quantidade: Math.min(novo.quantidade, QUANTIDADE_MAXIMA) });
    }
    return gravar(itens);
  },

  alterarQuantidade(chave, quantidade) {
    if (!ehInteiro(quantidade, QUANTIDADE_MINIMA) || quantidade > QUANTIDADE_MAXIMA) {
      return lerValidos();
    }
    return gravar(lerValidos().map((i) => (i.chave === chave ? { ...i, quantidade } : i)));
  },

  remover(chave) {
    return gravar(lerValidos().filter((i) => i.chave !== chave));
  },

  limpar() {
    return gravar([]);
  },

  // Aplica os preços confirmados pelo servidor: { '<variacao_id>:<forma>': centavos }.
  atualizarPrecos(precos) {
    return gravar(
      lerValidos().map((i) => (i.chave in precos ? { ...i, preco_centavos: precos[i.chave] } : i)),
    );
  },

  // { '<variacao_id>:<forma>': centavos } — enviado na revisão do pedido para detectar mudança de preço.
  precosVistos() {
    return Object.fromEntries(lerValidos().map((i) => [i.chave, i.preco_centavos]));
  },
};
