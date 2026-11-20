import { useEffect } from 'react';
import { useAsync } from '../../shared/hooks/useAsync.js';
import { clientesService } from '../services/clientesService.js';
import { useSessaoExpirada } from './useSessaoExpirada.js';

// Carrega a ficha do cliente a consultar/editar. Sem `id` (cliente novo) não busca nada.
export function useClientePorId(id) {
  const sessaoExpirou = useSessaoExpirada(id ? `/clientes/${id}` : '/clientes/novo');
  const carga = useAsync(() => clientesService.obter(id));
  const { executar, erro } = carga;

  useEffect(() => {
    if (id) executar();
  }, [id, executar]);

  useEffect(() => {
    if (erro) sessaoExpirou(erro);
  }, [erro, sessaoExpirou]);

  return {
    cliente: carga.dados,
    erro,
    carregando: !!id && !erro && (carga.carregando || carga.dados?.id !== id),
    recarregar: executar,
  };
}
