import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErroApi } from '../services/api.js';
import { caminhoDeLogin } from '../utils/redirecionamento.js';

const STATUS_NAO_AUTORIZADO = 401;

// Sessão vencida que a renovação automática não resolveu: limpa a sessão local (`encerrarLocal`, do
// contexto de cada app) e leva ao login, que devolve o usuário a `rota` depois.
// Devolve true se o erro era esse caso (e já foi tratado).
export function useSessaoExpirada(rota, encerrarLocal) {
  const navigate = useNavigate();

  return useCallback(
    (erro) => {
      if (!(erro instanceof ErroApi) || erro.status !== STATUS_NAO_AUTORIZADO) return false;
      encerrarLocal();
      navigate(caminhoDeLogin(rota), { replace: true });
      return true;
    },
    [encerrarLocal, navigate, rota],
  );
}
