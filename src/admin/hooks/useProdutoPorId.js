import { useEffect } from 'react';
import { useAsync } from '../../shared/hooks/useAsync.js';
import { produtosService } from '../services/produtosService.js';
import { useSessaoExpirada } from './useSessaoExpirada.js';

// Carrega o produto a editar. Sem `id` (produto novo) não busca nada.
export function useProdutoPorId(id) {
  const sessaoExpirou = useSessaoExpirada(`/produtos/${id}`);
  const carga = useAsync(() => produtosService.obter(id));
  const { executar, erro } = carga;

  useEffect(() => {
    if (id) executar();
  }, [id, executar]);

  useEffect(() => {
    if (erro) sessaoExpirou(erro);
  }, [erro, sessaoExpirou]);

  return {
    produto: carga.dados,
    erro,
    carregando: !!id && !erro && (carga.carregando || carga.dados?.id !== id),
    recarregar: executar,
  };
}
