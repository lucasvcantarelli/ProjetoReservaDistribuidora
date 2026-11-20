import { useContext } from 'react';
import { ConfirmContext } from '../contexts/ConfirmContext.jsx';

export function useConfirm() {
  const contexto = useContext(ConfirmContext);
  if (!contexto) throw new Error('useConfirm precisa estar dentro de <ConfirmProvider>.');
  return contexto;
}
