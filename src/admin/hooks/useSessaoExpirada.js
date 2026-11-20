import { useSessaoExpirada as useSessaoExpiradaGenerica } from '../../shared/hooks/useSessaoExpirada.js';
import { useSessaoAdmin } from './useSessaoAdmin.js';

// Versão do painel: encerra a sessão do admin e leva ao login, voltando a `rota`.
export function useSessaoExpirada(rota) {
  const { encerrarLocal } = useSessaoAdmin();
  return useSessaoExpiradaGenerica(rota, encerrarLocal);
}
