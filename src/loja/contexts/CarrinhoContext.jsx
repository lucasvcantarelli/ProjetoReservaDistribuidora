import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { CHAVE_CARRINHO, carrinhoService } from '../services/carrinhoService.js';
import { totalDoCarrinho } from '../utils/produto.js';

export const CarrinhoContext = createContext(null);

export function CarrinhoProvider({ children }) {
  const [itens, setItens] = useState(() => carrinhoService.ler());

  // Mantém várias abas em sincronia: outra aba mudou o carrinho, relê.
  useEffect(() => {
    function aoMudarStorage(evento) {
      if (evento.key === CHAVE_CARRINHO || evento.key === null) setItens(carrinhoService.ler());
    }
    window.addEventListener('storage', aoMudarStorage);
    return () => window.removeEventListener('storage', aoMudarStorage);
  }, []);

  const adicionar = useCallback((item) => setItens(carrinhoService.adicionar(item)), []);
  const alterarQuantidade = useCallback(
    (chave, quantidade) => setItens(carrinhoService.alterarQuantidade(chave, quantidade)),
    [],
  );
  const remover = useCallback((chave) => setItens(carrinhoService.remover(chave)), []);
  const limpar = useCallback(() => setItens(carrinhoService.limpar()), []);
  const atualizarPrecos = useCallback(
    (precos) => setItens(carrinhoService.atualizarPrecos(precos)),
    [],
  );

  const valor = useMemo(
    () => ({
      itens,
      quantidadeDeItens: itens.length,
      totalCentavos: totalDoCarrinho(itens),
      adicionar,
      alterarQuantidade,
      remover,
      limpar,
      atualizarPrecos,
    }),
    [itens, adicionar, alterarQuantidade, remover, limpar, atualizarPrecos],
  );
  return <CarrinhoContext.Provider value={valor}>{children}</CarrinhoContext.Provider>;
}
