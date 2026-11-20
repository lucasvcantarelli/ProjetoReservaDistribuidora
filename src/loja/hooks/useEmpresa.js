import { useContext } from 'react';
import { EmpresaContext } from '../contexts/EmpresaContext.jsx';

export function useEmpresa() {
  const contexto = useContext(EmpresaContext);
  if (!contexto) throw new Error('useEmpresa precisa estar dentro de <EmpresaProvider>.');
  return contexto;
}
