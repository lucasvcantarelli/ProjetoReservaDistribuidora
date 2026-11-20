import { clienteDescartavel } from '../_shared/infra/db.js';
import { falhar, servir } from '../_shared/infra/http.js';
import { exigirServicoDisponivel, formatarSessao } from '../_shared/infra/sessaoUsuario.js';

const MSG_EXPIRADA = 'Sessão expirada. Faça login novamente.';

servir(async (_req, { refresh_token }) => {
  if (typeof refresh_token !== 'string' || !refresh_token) falhar(401, MSG_EXPIRADA);
  const { data, error } = await clienteDescartavel().auth.refreshSession({ refresh_token });
  exigirServicoDisponivel(error);
  if (error || !data?.session) falhar(401, MSG_EXPIRADA);
  return { sessao: formatarSessao(data.session) };
});
