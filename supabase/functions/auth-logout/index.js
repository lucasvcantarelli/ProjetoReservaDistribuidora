import { db } from '../_shared/infra/db.js';
import { falhar, servir } from '../_shared/infra/http.js';
import { tokenDaRequisicao } from '../_shared/infra/auth.js';

servir(async (req) => {
  const token = tokenDaRequisicao(req);
  if (!token) falhar(401, 'Faça login para continuar.');
  try {
    await db().auth.admin.signOut(token, 'local');
  } catch (e) {
    console.error(e); // token já inválido não é problema: o objetivo é sair
  }
  return null;
});
