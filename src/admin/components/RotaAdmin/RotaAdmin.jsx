import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { caminhoDeLogin } from '../../../shared/utils/redirecionamento.js';
import { useSessaoAdmin } from '../../hooks/useSessaoAdmin.js';

// Protege as rotas do painel; deslogado vai ao login (relativo ao basename) e volta depois.
export default function RotaAdmin() {
  const { usuario } = useSessaoAdmin();
  const { pathname, search } = useLocation();
  if (!usuario) return <Navigate to={caminhoDeLogin(`${pathname}${search}`)} replace />;
  return <Outlet />;
}
