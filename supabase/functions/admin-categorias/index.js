import { db } from '../_shared/infra/db.js';
import { exigirAdmin } from '../_shared/infra/auth.js';
import { falhar, servir } from '../_shared/infra/http.js';
import { lancar } from '../_shared/infra/erroBanco.js';
import { ehUuid, escaparLike, gerarSlug, prefixoSlug, slugUnico } from '../_shared/domain/texto.js';

const TABELA = 'categorias';
const COLUNAS = 'id, nome, slug, ordem, ativo';
const MAX_NOME = 80;
const MAX_ORDEM = 9999;
const MAX_IDS_REORDENAR = 500;
const TENTATIVAS_SLUG = 3;
const CODIGO_UNICO = '23505';
const CODIGO_FK = '23503';
const MSG_COM_PRODUTOS = 'Esta categoria tem produtos. Mova ou exclua os produtos antes.';

function validarNome(nome) {
  if (typeof nome !== 'string' || !nome.trim())
    falhar(400, 'Informe o nome.', { nome: 'Obrigatório.' });
  const limpo = nome.trim();
  if (limpo.length > MAX_NOME) {
    falhar(400, 'Nome grande demais.', { nome: `Use no máximo ${MAX_NOME} caracteres.` });
  }
  return limpo;
}

function exigirId(id) {
  if (!ehUuid(id)) falhar(400, 'Categoria inválida.');
  return id;
}

async function listar() {
  const { data, error } = await db().from(TABELA).select(COLUNAS).order('ordem').order('nome');
  lancar(error);
  return data;
}

async function slugLivre(nome) {
  const base = gerarSlug(nome);
  const { data, error } = await db()
    .from(TABELA)
    .select('slug')
    .like('slug', `${escaparLike(prefixoSlug(base))}%`);
  lancar(error);
  return slugUnico(
    base,
    data.map((c) => c.slug),
  );
}

async function proximaOrdem() {
  const { data, error } = await db()
    .from(TABELA)
    .select('ordem')
    .order('ordem', { ascending: false, nullsFirst: false })
    .limit(1);
  lancar(error);
  return (data[0]?.ordem ?? -1) + 1;
}

async function criar({ nome }) {
  const nomeLimpo = validarNome(nome);
  const ordem = await proximaOrdem();
  for (let tentativa = 0; tentativa < TENTATIVAS_SLUG; tentativa += 1) {
    const slug = await slugLivre(nomeLimpo);
    const { data, error } = await db()
      .from(TABELA)
      .insert({ nome: nomeLimpo, slug, ordem, ativo: true })
      .select(COLUNAS)
      .single();
    if (error?.code === CODIGO_UNICO) continue; // outra criação pegou o slug: recalcula
    lancar(error);
    return data;
  }
  throw new Error('Não foi possível gerar um slug único.');
}

function alteracoesDe({ nome, ativo, ordem }) {
  const alteracoes = {};
  if (nome !== undefined) alteracoes.nome = validarNome(nome);
  if (ativo !== undefined) {
    if (typeof ativo !== 'boolean') falhar(400, 'Valor inválido.', { ativo: 'Valor inválido.' });
    alteracoes.ativo = ativo;
  }
  if (ordem !== undefined) {
    if (!Number.isInteger(ordem) || ordem < 0 || ordem > MAX_ORDEM) {
      falhar(400, 'Ordem inválida.', { ordem: `Use um inteiro entre 0 e ${MAX_ORDEM}.` });
    }
    alteracoes.ordem = ordem;
  }
  return alteracoes;
}

async function editar(corpo) {
  const id = exigirId(corpo.id);
  const alteracoes = alteracoesDe(corpo);
  if (Object.keys(alteracoes).length === 0) falhar(400, 'Nada para alterar.');
  // O slug não muda ao renomear: preserva os links já publicados.
  const { data, error } = await db()
    .from(TABELA)
    .update(alteracoes)
    .eq('id', id)
    .select(COLUNAS)
    .maybeSingle();
  lancar(error);
  if (!data) falhar(404, 'Categoria não encontrada.');
  return data;
}

async function excluir({ id }) {
  exigirId(id);
  const { count, error } = await db()
    .from('produtos')
    .select('id', { count: 'exact', head: true })
    .eq('categoria_id', id);
  lancar(error);
  if (count > 0) falhar(409, MSG_COM_PRODUTOS);
  const { data, error: erroExcluir } = await db().from(TABELA).delete().eq('id', id).select('id');
  if (erroExcluir?.code === CODIGO_FK) falhar(409, MSG_COM_PRODUTOS);
  lancar(erroExcluir);
  if (data.length === 0) falhar(404, 'Categoria não encontrada.');
  return { id };
}

async function reordenar({ ids }) {
  const valido =
    Array.isArray(ids) &&
    ids.length > 0 &&
    ids.length <= MAX_IDS_REORDENAR &&
    ids.every(ehUuid) &&
    new Set(ids).size === ids.length;
  if (!valido) falhar(400, 'Lista de categorias inválida.');
  const { data, error } = await db().from(TABELA).select('id').in('id', ids);
  lancar(error);
  if (data.length !== ids.length) falhar(404, 'Categoria não encontrada.');
  for (const [ordem, id] of ids.entries()) {
    const { error: erroOrdem } = await db().from(TABELA).update({ ordem }).eq('id', id);
    lancar(erroOrdem);
  }
  return listar();
}

const ACOES = { listar, criar, editar, excluir, reordenar };

servir(async (req, corpo) => {
  await exigirAdmin(req);
  const acao = Object.hasOwn(ACOES, corpo.acao) ? ACOES[corpo.acao] : null;
  if (!acao) falhar(400, 'Ação inválida.');
  return acao(corpo);
});
