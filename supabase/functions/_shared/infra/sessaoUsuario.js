// Peças compartilhadas pelo login: autenticar e montar a resposta (só existe o painel admin).
import { servicoIndisponivel } from '../domain/erroAuth.js';
import { clienteDescartavel, db } from './db.js';
import { ehAdmin } from './auth.js';
import { falhar } from './http.js';

export const PAINEIS = ['admin'];
export const NOME_ADMIN = 'Administrador';
export const MSG_CREDENCIAIS = 'E-mail ou senha inválidos.';
export const MSG_INDISPONIVEL = 'Serviço indisponível. Tente novamente em instantes.';
export const STATUS_INDISPONIVEL = 503;

// Limite de requisições (429) ou falha (5xx) do GoTrue não é erro do usuário: responde 503.
export function exigirServicoDisponivel(error) {
  if (servicoIndisponivel(error)) falhar(STATUS_INDISPONIVEL, MSG_INDISPONIVEL);
}

export function formatarSessao(sessao) {
  const { access_token, refresh_token, expires_at } = sessao;
  return { access_token, refresh_token, expires_at };
}

// Autentica com um cliente descartável; devolve { user, sessao } ou null se as credenciais falham.
// Se o GoTrue estiver limitando ou fora do ar, responde 503 (não é falha de credencial).
export async function autenticar(email, senha) {
  const { data, error } = await clienteDescartavel().auth.signInWithPassword({
    email,
    password: senha,
  });
  exigirServicoDisponivel(error);
  if (error || !data?.session || !data?.user) return null;
  return { user: data.user, sessao: formatarSessao(data.session) };
}

// Perfil do administrador; null quando o usuário não é admin.
export async function perfilAdmin(user) {
  return (await ehAdmin(user.id)) ? { nome: NOME_ADMIN, papel: 'admin' } : null;
}

export function montarResposta(sessao, user, perfil) {
  return {
    sessao,
    usuario: { id: user.id, email: user.email, nome: perfil.nome, papel: perfil.papel },
  };
}

// Encerra só a sessão recém-criada (escopo 'local'), sem derrubar as outras sessões do usuário.
export async function descartarSessao(sessao) {
  try {
    await db().auth.admin.signOut(sessao.access_token, 'local');
  } catch {
    /* sem efeito para o usuário */
  }
}
