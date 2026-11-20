// Acesso ao banco para o limite de tentativas. Recebe `db` (cliente supabase-js com service role)
// por parâmetro; usa só o query builder, sem SQL montado à mão.
import { avaliarBloqueio, janelaDaAcao, normalizarEmail } from '../domain/rateLimit.js';

const TABELA = 'tentativas_login';
const ACAO_PADRAO = 'login';

function lancarSeErro(error) {
  if (error) throw new Error(error.message);
}

async function buscarTentativas(db, janela, acao, coluna, valor) {
  let consulta = db
    .from(TABELA)
    .select('criado_em')
    .eq('acao', acao)
    .gte('criado_em', janela.desde);
  if (janela.apenasFalhas) consulta = consulta.eq('sucesso', false);
  // As N mais recentes bastam para contar o limite e achar a última tentativa.
  const { data, error } = await consulta
    .eq(coluna, valor)
    .order('criado_em', { ascending: false })
    .limit(janela.maxFalhas);
  lancarSeErro(error);
  return data ?? [];
}

function maisRestritivo(bloqueios) {
  return bloqueios.reduce((a, b) => (b.liberaEm > a.liberaEm ? b : a));
}

// Chave sem valor (ex.: IP desconhecido) não é aplicada: nunca existe um balde compartilhado.
/**
 * Verifica se a combinação IP/e-mail está bloqueada para a ação.
 *
 * @param {object} db Cliente supabase-js.
 * @param {{ ip: string|null, email?: string, acao: 'login'|'recuperar'|'pedido' }} dados
 * @param {Date} [agora]
 * @returns {Promise<{ bloqueado: boolean, liberaEm?: Date }>}
 */
export async function verificarLimite(db, { ip, email, acao }, agora = new Date()) {
  const janela = janelaDaAcao(acao, agora);
  const valores = { ip, email: normalizarEmail(email) };
  const bloqueios = [];

  for (const chave of janela.chaves) {
    if (!valores[chave]) continue;
    const daChave = { ...janela, maxFalhas: janela.maxPorChave?.[chave] ?? janela.maxFalhas };
    const tentativas = await buscarTentativas(db, daChave, acao, chave, valores[chave]);
    const resultado = avaliarBloqueio(tentativas, agora, daChave);
    if (resultado.bloqueado) bloqueios.push(resultado);
  }

  return bloqueios.length > 0 ? maisRestritivo(bloqueios) : { bloqueado: false };
}

/**
 * Registra uma tentativa (sucesso ou falha) para a ação.
 *
 * @param {object} db Cliente supabase-js.
 * @param {{ ip: string|null, email?: string, sucesso: boolean, acao?: string }} dados
 * @returns {Promise<number>} id da tentativa (para `marcarSucesso`).
 */
export async function registrarTentativa(db, { ip, email, sucesso, acao = ACAO_PADRAO }) {
  const { data, error } = await db
    .from(TABELA)
    .insert({ ip, email: normalizarEmail(email), sucesso, acao })
    .select('id')
    .single();
  lancarSeErro(error);
  return data.id;
}

/**
 * Converte uma tentativa registrada como falha em sucesso (registrar antes, confirmar depois,
 * evita que requisições paralelas passem todas pelo limite).
 *
 * @param {object} db Cliente supabase-js.
 * @param {number} id Id devolvido por `registrarTentativa`.
 */
export async function marcarSucesso(db, id) {
  const { error } = await db.from(TABELA).update({ sucesso: true }).eq('id', id);
  lancarSeErro(error);
}

/**
 * Apaga uma tentativa registrada (ex.: o GoTrue estava indisponível: a falha não é do usuário).
 *
 * @param {object} db Cliente supabase-js.
 * @param {number} id Id devolvido por `registrarTentativa`.
 */
export async function removerTentativa(db, id) {
  const { error } = await db.from(TABELA).delete().eq('id', id);
  lancarSeErro(error);
}
