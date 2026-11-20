import { Outlet } from 'react-router-dom';
import AvisoPrivacidade from '../../../shared/components/AvisoPrivacidade';

// Raiz de todas as rotas do painel (inclusive as públicas): leva o aviso de privacidade.
export default function RaizAdmin() {
  return (
    <>
      <Outlet />
      <AvisoPrivacidade contexto="admin" />
    </>
  );
}
