import { db } from '../_shared/infra/db.js';
import { ehAdmin } from '../_shared/infra/auth.js';
import { falhar, servir } from '../_shared/infra/http.js';
import { validarSenha } from '../_shared/domain/cadastro.js';
import { tokenDeRecuperacao } from '../_shared/domain/recuperacaoSenha.js';

const MSG_LINK_INVALIDO = 'Link inválido ou expirado. Solicite a recuperação novamente.';

servir(async (_req, { access_token, senha }) => {
  if (typeof access_token !== 'string' || !access_token) falhar(400, MSG_LINK_INVALIDO);
  const validacao = validarSenha(senha);
  if (validacao.erro) falhar(400, validacao.erro, { senha: validacao.erro });

  const { data, error } = await db().auth.getUser(access_token);
  if (error || !data?.user) falhar(401, MSG_LINK_INVALIDO);
  // Só vale token de link de recuperação; um login comum não pode trocar a senha por aqui.
  if (!tokenDeRecuperacao(access_token)) falhar(401, MSG_LINK_INVALIDO);
  // Só administradores têm conta; qualquer outro usuário do Auth não troca senha por aqui.
  if (!(await ehAdmin(data.user.id))) falhar(401, MSG_LINK_INVALIDO);

  const { error: erroAtualizar } = await db().auth.admin.updateUserById(data.user.id, {
    password: validacao.valor,
  });
  if (erroAtualizar) throw new Error(erroAtualizar.message);

  // Derruba as demais sessões (ex.: de quem tinha a senha antiga); a atual vale só até expirar.
  const { error: erroSessoes } = await db().auth.admin.signOut(access_token, 'others');
  if (erroSessoes) console.error(erroSessoes.message);
  return null;
});
