import { db } from './db.js';
import { ErroHttp } from './http.js';
import { normalizarEmail } from '../domain/rateLimit.js';

const MSG_LOGIN = 'Faça login para continuar.';

export function tokenDaRequisicao(req) {
  const m = /^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization') ?? '');
  return m ? m[1] : null;
}

// Valida o token no Supabase Auth; devolve o usuário ou null.
export async function usuarioDaRequisicao(req) {
  const token = tokenDaRequisicao(req);
  if (!token) return null;
  const { data, error } = await db().auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// O usuário do Auth é administrador? (Só administradores têm conta no sistema.)
export async function ehAdmin(userId) {
  const { data, error } = await db()
    .from('admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

// O e-mail pertence a um administrador? Poucos admins: confere um a um pelo Auth.
export async function emailEhDeAdmin(email) {
  const alvo = normalizarEmail(email);
  if (!alvo) return false;
  const { data, error } = await db().from('admins').select('user_id');
  if (error) throw new Error(error.message);
  for (const { user_id: id } of data ?? []) {
    const { data: achado, error: erroAuth } = await db().auth.admin.getUserById(id);
    if (erroAuth) throw new Error(erroAuth.message);
    if (normalizarEmail(achado?.user?.email) === alvo) return true;
  }
  return false;
}

export async function exigirAdmin(req) {
  const user = await usuarioDaRequisicao(req);
  if (!user) throw new ErroHttp(401, MSG_LOGIN);
  if (!(await ehAdmin(user.id))) throw new ErroHttp(403, 'Acesso não permitido.');
  return { user };
}
