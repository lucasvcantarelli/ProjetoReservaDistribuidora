import { createContext, useEffect, useMemo } from 'react';
import { useAsync } from '../../shared/hooks/useAsync.js';
import { empresaService } from '../services/empresaService.js';

export const EmpresaContext = createContext(null);

const EMPRESA_PADRAO = { nome: 'Reserva Distribuidora', logo_url: null };

// Carrega a configuração pública da empresa uma única vez; se falhar, usa o nome padrão.
export function EmpresaProvider({ children }) {
  const { executar, dados } = useAsync(() => empresaService.obter());

  useEffect(() => {
    executar();
  }, [executar]);

  const valor = useMemo(() => ({ ...EMPRESA_PADRAO, ...dados }), [dados]);
  return <EmpresaContext.Provider value={valor}>{children}</EmpresaContext.Provider>;
}
