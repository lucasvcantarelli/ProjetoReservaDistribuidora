import { useCallback, useEffect, useState } from 'react';
import { useAsync } from '../../shared/hooks/useAsync.js';
import { useConfirm } from '../../shared/hooks/useConfirm.js';
import { useToast } from '../../shared/hooks/useToast.js';
import { ErroApi } from '../../shared/services/api.js';
import { TAMANHO_PAGINA, produtosService } from '../services/produtosService.js';
import { useSessaoExpirada } from './useSessaoExpirada.js';

const ROTA_PRODUTOS = '/produtos';
const MSG_EXCLUIDO = 'Produto excluído.';

// Lista de produtos (busca, categoria e página vêm da URL) e a exclusão com confirmação.
export function useProdutos({ busca, categoriaId, pagina }) {
  const { mostrar } = useToast();
  const { confirmar } = useConfirm();
  const sessaoExpirou = useSessaoExpirada(ROTA_PRODUTOS);
  const [excluindo, setExcluindo] = useState(false);
  const lista = useAsync(() => produtosService.listar({ busca, categoriaId, pagina }));
  const { executar: carregar, erro } = lista;

  useEffect(() => {
    carregar();
  }, [carregar, busca, categoriaId, pagina]);

  useEffect(() => {
    if (erro) sessaoExpirou(erro);
  }, [erro, sessaoExpirou]);

  const excluir = useCallback(
    async (produto) => {
      const confirmado = await confirmar({
        titulo: `Excluir ${produto.nome}?`,
        texto: 'As fotos também serão apagadas.',
        textoConfirmar: 'Excluir',
        variante: 'perigo',
      });
      if (!confirmado) return;
      setExcluindo(true);
      try {
        await produtosService.excluir(produto.id);
        mostrar({ texto: MSG_EXCLUIDO });
        await carregar();
      } catch (falha) {
        if (!(falha instanceof ErroApi)) throw falha;
        if (!sessaoExpirou(falha)) mostrar({ tipo: 'erro', texto: falha.message });
      } finally {
        setExcluindo(false);
      }
    },
    [confirmar, mostrar, carregar, sessaoExpirou],
  );

  const total = lista.dados?.total ?? 0;
  return {
    itens: lista.dados?.itens ?? [],
    total,
    totalPaginas: Math.max(1, Math.ceil(total / TAMANHO_PAGINA)),
    carregando: lista.carregando || (!lista.dados && !erro),
    erro,
    recarregar: carregar,
    excluindo,
    excluir,
  };
}
