import { useState } from 'react';
import { useToast } from '../../shared/hooks/useToast.js';
import { useCarrinho } from './useCarrinho.js';
import {
  QUANTIDADE_MINIMA,
  formasDaVariacao,
  montarItemCarrinho,
  precoDaForma,
} from '../utils/produto.js';

const MSG_ADICIONADO = 'Adicionado ao carrinho.';

// Escolhas do cliente na página do produto: tamanho, forma de venda e quantidade.
export function useCompra(produto) {
  const { adicionar } = useCarrinho();
  const toast = useToast();

  const variacoes = produto.variacoes.filter((v) => formasDaVariacao(v).length > 0);
  const [variacaoId, setVariacaoId] = useState(variacoes[0]?.id);
  const [formaEscolhida, setFormaEscolhida] = useState(null);
  const [quantidade, setQuantidade] = useState(QUANTIDADE_MINIMA);

  const variacao = variacoes.find((v) => v.id === variacaoId) ?? variacoes[0] ?? null;
  const formas = variacao ? formasDaVariacao(variacao) : [];
  const forma = formas.includes(formaEscolhida) ? formaEscolhida : (formas[0] ?? null);

  function adicionarAoCarrinho() {
    if (!variacao || !forma) return;
    adicionar(montarItemCarrinho(produto, variacao, forma, quantidade));
    toast.mostrar({ tipo: 'sucesso', texto: MSG_ADICIONADO });
  }

  return {
    variacoes,
    variacao,
    formas,
    forma,
    quantidade,
    preco: variacao && forma ? precoDaForma(variacao, forma) : null,
    escolherVariacao: setVariacaoId,
    escolherForma: setFormaEscolhida,
    mudarQuantidade: setQuantidade,
    adicionarAoCarrinho,
  };
}
