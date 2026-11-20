import { db } from '../_shared/infra/db.js';
import { exigirAdmin } from '../_shared/infra/auth.js';
import { falhar, servir } from '../_shared/infra/http.js';
import { lancar } from '../_shared/infra/erroBanco.js';
import { TAMANHO_PAGINA, buscarPagina, lerPagina } from '../_shared/infra/paginacao.js';
import {
  MAX_BUSCA,
  MAX_RESULTADOS_BUSCA_TEXTO,
  interpretarBusca,
  perfilCliente,
  resumoCliente,
  unirPorId,
  validarClienteAdmin,
  validarEdicaoFicha,
} from '../_shared/domain/clienteAdmin.js';
import { violouUnicidade } from '../_shared/domain/erroBanco.js';
import { ehUuid, escaparLike, prepararBusca } from '../_shared/domain/texto.js';

const COLUNAS_LISTA =
  'id, tipo_pessoa, nome, razao_social, nome_fantasia, cpf_cnpj, telefone, email, cidade, uf';
const COLUNAS_FICHA =
  'id, tipo_pessoa, nome, razao_social, nome_fantasia, cpf_cnpj, email, telefone, cep, rua, numero, complemento, bairro, cidade, uf, observacoes, criado_em, atualizado_em';
const COLUNAS_TEXTO_BUSCA = ['nome', 'razao_social', 'nome_fantasia', 'email'];
const COLUNAS_DIGITOS_BUSCA = ['cpf_cnpj', 'telefone'];
const CONSTRAINT_DOCUMENTO = 'clientes_cpf_cnpj_key';
const MSG_DOCUMENTO_DUPLICADO = 'Este documento já está cadastrado.';
const MSG_CAMPOS = 'Confira os campos informados.';

const consultaLista = () => db().from('clientes').select(COLUNAS_LISTA, { count: 'exact' });

const contem = (termo) => `%${escaparLike(termo)}%`;

// Busca em várias colunas: uma consulta `ilike` por coluna, unidas em JS (evita montar filtros
// `.or()` com texto do usuário). Considera no máximo MAX_RESULTADOS_BUSCA_TEXTO por consulta.
async function listarPorColunas(colunas, termo, pag) {
  const buscar = async (coluna) => {
    const { data, error } = await db()
      .from('clientes')
      .select(COLUNAS_LISTA)
      .ilike(coluna, contem(termo))
      .order('nome')
      .order('id')
      .limit(MAX_RESULTADOS_BUSCA_TEXTO);
    lancar(error);
    return data;
  };
  const todos = unirPorId(...(await Promise.all(colunas.map(buscar))));
  const de = (pag - 1) * TAMANHO_PAGINA;
  return { linhas: todos.slice(de, de + TAMANHO_PAGINA), total: todos.length };
}

function listarTodos(pag) {
  return buscarPagina(consultaLista().order('nome').order('id'), pag);
}

async function listar({ busca, pagina }) {
  const pag = lerPagina(pagina);
  const consulta = interpretarBusca(prepararBusca(busca, MAX_BUSCA));
  let resultado;
  if (!consulta) resultado = await listarTodos(pag);
  else if (consulta.tipo === 'documento') {
    resultado = await listarPorColunas(COLUNAS_DIGITOS_BUSCA, consulta.digitos, pag);
  } else resultado = await listarPorColunas(COLUNAS_TEXTO_BUSCA, consulta.termo, pag);
  return { itens: resultado.linhas.map(resumoCliente), total: resultado.total };
}

async function buscarCliente(id) {
  if (!ehUuid(id)) falhar(400, 'Cliente inválido.');
  const { data, error } = await db()
    .from('clientes')
    .select(COLUNAS_FICHA)
    .eq('id', id)
    .maybeSingle();
  lancar(error);
  if (!data) falhar(404, 'Cliente não encontrado.');
  return data;
}

async function obter({ id }) {
  return perfilCliente(await buscarCliente(id));
}

// 409 quando o documento já pertence a outro cliente (constraint única, nunca string vazia).
function tratarDuplicidade(error) {
  if (violouUnicidade(error, CONSTRAINT_DOCUMENTO)) {
    falhar(409, MSG_DOCUMENTO_DUPLICADO, { cpf_cnpj: MSG_DOCUMENTO_DUPLICADO });
  }
  lancar(error);
}

async function criar({ dados }) {
  const resultado = validarClienteAdmin(dados);
  if (!resultado.ok) falhar(400, MSG_CAMPOS, resultado.campos);
  const { data, error } = await db()
    .from('clientes')
    .insert(resultado.valor)
    .select(COLUNAS_FICHA)
    .single();
  tratarDuplicidade(error);
  return perfilCliente(data);
}

async function editar({ id, dados }) {
  const atual = await buscarCliente(id);
  const resultado = validarEdicaoFicha(dados, atual);
  if (!resultado.ok) falhar(400, MSG_CAMPOS, resultado.campos);
  if (Object.keys(resultado.valor).length === 0) falhar(400, 'Nada para alterar.');

  const { data, error } = await db()
    .from('clientes')
    .update(resultado.valor)
    .eq('id', id)
    .select(COLUNAS_FICHA)
    .single();
  tratarDuplicidade(error);
  return perfilCliente(data);
}

async function excluir({ id }) {
  await buscarCliente(id);
  const { error } = await db().from('clientes').delete().eq('id', id);
  lancar(error);
  return null;
}

const ACOES = { listar, obter, criar, editar, excluir };

servir(async (req, corpo) => {
  await exigirAdmin(req);
  const acao = Object.hasOwn(ACOES, corpo.acao) ? ACOES[corpo.acao] : null;
  if (!acao) falhar(400, 'Ação inválida.');
  return acao(corpo);
});
