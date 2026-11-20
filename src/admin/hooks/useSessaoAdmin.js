import { useContext } from 'react';
import { SessaoAdminContext } from '../contexts/SessaoAdminContext.jsx';

export function useSessaoAdmin() {
  const contexto = useContext(SessaoAdminContext);
  if (!contexto) throw new Error('useSessaoAdmin precisa estar dentro de <SessaoAdminProvider>.');
  return contexto;
}
