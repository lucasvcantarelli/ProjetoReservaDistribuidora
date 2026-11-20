import { useCallback, useEffect, useState } from 'react';
import { useAsync } from '../../shared/hooks/useAsync.js';
import { useConfirm } from '../../shared/hooks/useConfirm.js';
import { useToast } from '../../shared/hooks/useToast.js';
import { ErroApi } from '../../shared/services/api.js';
import { TAMANHO_PAGINA, clientesService } from '../services/clientesService.js';
import { nomePrincipalCliente } from '../utils/clienteNome.js';
import { useSessaoExpirada } from './useSessaoExpirada.js';

const ROTA_CLIENTES = '/clientes';
const MSG_EXCLUIDO = 'Cliente excluído.';

// Lista de clientes (busca e página vêm da URL) e a exclusão com confirmação.
export function useClientes({ busca, pagina }) {
  const { mostrar } = useToast();
  const { confirmar } = useConfirm();
  const sessaoExpirou = useSessaoExpirada(ROTA_CLIENTES);
  const [excluindo, setExcluindo] = useState(false);
  const lista = useAsync(() => clientesService.listar({ busca, pagina }));
  const { executar: carregar, erro } = lista;

  useEffect(() => {
    carregar();
  }, [carregar, busca, pagina]);

  useEffect(() => {
    if (erro) sessaoExpirou(erro);
  }, [erro, sessaoExpirou]);

  const excluir = useCallback(
    async (cliente) => {
      const confirmado = await confirmar({
        titulo: `Excluir ${nomePrincipalCliente(cliente)}?`,
        texto: 'Essa ação não pode ser desfeita.',
        textoConfirmar: 'Excluir',
        variante: 'perigo',
      });
      if (!confirmado) return;
      setExcluindo(true);
      try {
        await clientesService.excluir(cliente.id);
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
