import { useCallback, useEffect } from 'react';
import { useAsync } from '../../shared/hooks/useAsync.js';
import { TAMANHO_PAGINA, catalogoService } from '../services/catalogoService.js';

// Lista de produtos (filtrada por categoria/busca/página) e as categorias para os chips.
export function useCatalogo({ categoriaSlug, busca, pagina }) {
  const lista = useAsync(() => catalogoService.produtos({ categoriaSlug, busca, pagina }));
  const categorias = useAsync(() => catalogoService.categorias());
  const { executar: carregarLista } = lista;
  const { executar: carregarCategorias } = categorias;

  useEffect(() => {
    carregarLista();
  }, [carregarLista, categoriaSlug, busca, pagina]);

  useEffect(() => {
    carregarCategorias();
  }, [carregarCategorias]);

  const recarregar = useCallback(() => {
    carregarLista();
    carregarCategorias();
  }, [carregarLista, carregarCategorias]);

  const total = lista.dados?.total ?? 0;
  return {
    itens: lista.dados?.itens ?? [],
    totalPaginas: Math.max(1, Math.ceil(total / TAMANHO_PAGINA)),
    categorias: categorias.dados ?? [],
    carregando: lista.carregando || (!lista.dados && !lista.erro),
    erro: lista.erro,
    recarregar,
  };
}
