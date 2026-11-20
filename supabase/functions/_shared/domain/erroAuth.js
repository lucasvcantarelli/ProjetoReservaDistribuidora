// Classifica erros do GoTrue (Supabase Auth). Módulo puro: sem imports de Deno/npm.

const STATUS_LIMITE_EXCEDIDO = 429;
const STATUS_ERRO_SERVIDOR_MIN = 500;
const STATUS_SEM_RESPOSTA = 0;
const CODIGOS_LIMITE = ['over_request_rate_limit', 'over_email_send_rate_limit'];

/**
 * Indica se o erro é do serviço (limite de requisições do GoTrue, falha 5xx ou sem resposta) e
 * não de credenciais inválidas. Nesse caso a tentativa não deve contar como falha do usuário.
 *
 * @param {{ status?: number, code?: string } | null | undefined} erro Erro devolvido pelo supabase-js.
 */
export function servicoIndisponivel(erro) {
  if (!erro) return false;
  const { status, code } = erro;
  if (CODIGOS_LIMITE.includes(code)) return true;
  if (status === STATUS_LIMITE_EXCEDIDO || status === STATUS_SEM_RESPOSTA) return true;
  return typeof status === 'number' && status >= STATUS_ERRO_SERVIDOR_MIN;
}
