import { useCallback, useEffect } from 'react';
import { useAsync } from '../../shared/hooks/useAsync.js';
import { catalogoService } from '../services/catalogoService.js';

export function useProduto(id) {
  const { executar, dados, erro } = useAsync(() => catalogoService.produto(id));

  useEffect(() => {
    executar();
  }, [executar, id]);

  const recarregar = useCallback(() => executar(), [executar]);
  // `dados` pode ser de outro produto enquanto o novo carrega.
  const produto = dados?.id === id ? dados : null;
  return { produto, carregando: !produto && !erro, erro, recarregar };
}
