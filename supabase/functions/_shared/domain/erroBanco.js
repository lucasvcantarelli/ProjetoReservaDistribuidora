// Tradução de erros do Postgres (vindos do PostgREST) em respostas 4xx em PT-BR.
// Módulo puro: sem imports de Deno/npm.

export const CODIGO_UNICO = '23505';
export const CODIGO_CHECK = '23514';
export const CODIGO_TEXTO_INVALIDO = '22P02';

const TRADUCOES = {
  [CODIGO_CHECK]: 'Os dados informados não são válidos.',
  [CODIGO_TEXTO_INVALIDO]: 'Valor em formato inválido.',
};

/**
 * @param {{ code?: string } | null | undefined} error Erro devolvido pelo supabase-js.
 * @returns {{ status: number, erro: string } | null} Resposta 400 para violação de check (23514)
 *   e texto inválido (22P02); null para os demais erros (devem virar 500 ou ser tratados antes).
 */
export function traduzirErroBanco(error) {
  const erro = TRADUCOES[error?.code];
  return erro ? { status: 400, erro } : null;
}

/**
 * Violação de unicidade (23505) de uma constraint específica, identificada pelo nome — duas
 * constraints únicas na mesma tabela compartilham o código.
 * @param {{ code?: string, message?: string, details?: string } | null | undefined} error
 * @param {string} constraint Nome da constraint, ex.: `clientes_cpf_cnpj_key`.
 */
export function violouUnicidade(error, constraint) {
  if (error?.code !== CODIGO_UNICO) return false;
  return `${error.message ?? ''} ${error.details ?? ''}`.includes(`"${constraint}"`);
}
