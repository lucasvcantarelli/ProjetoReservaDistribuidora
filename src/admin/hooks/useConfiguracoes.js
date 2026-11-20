import { useEffect } from 'react';
import { useAsync } from '../../shared/hooks/useAsync.js';
import { configService } from '../services/configService.js';
import { useSessaoExpirada } from './useSessaoExpirada.js';

const ROTA_CONFIGURACOES = '/configuracoes';

// Carrega as configurações da empresa.
export function useConfiguracoes() {
  const sessaoExpirou = useSessaoExpirada(ROTA_CONFIGURACOES);
  const carga = useAsync(() => configService.obter());
  const { executar, erro } = carga;

  useEffect(() => {
    executar();
  }, [executar]);

  useEffect(() => {
    if (erro) sessaoExpirou(erro);
  }, [erro, sessaoExpirou]);

  return {
    config: carga.dados,
    erro,
    carregando: !erro && !carga.dados,
    recarregar: executar,
  };
}
