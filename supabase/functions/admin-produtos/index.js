import { db, urlPublica } from '../_shared/infra/db.js';
import { exigirAdmin } from '../_shared/infra/auth.js';
import { falhar, servir } from '../_shared/infra/http.js';
import { lancar } from '../_shared/infra/erroBanco.js';
import { buscarPagina, lerPagina } from '../_shared/infra/paginacao.js';
import { removerPasta } from '../_shared/infra/fotosStorage.js';
import { menorPreco, validarProduto } from '../_shared/domain/produto.js';
import { ehUuid, escaparLike, prepararBusca } from '../_shared/domain/texto.js';

const MAX_BUSCA = 80;
const CODIGO_FK = '23503';
const CODIGO_NAO_ENCONTRADO = 'P0002';
const CODIGO_DADO_INVALIDO = '22023';

const porOrdem = (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0);

function exigirId(id) {
  if (!ehUuid(id)) falhar(400, 'Produto inválido.');
  return id;
}

async function listar({ busca, categoria_id, pagina }) {
  const pag = lerPagina(pagina);
  if (categoria_id !== undefined && categoria_id !== null && !ehUuid(categoria_id)) {
    falhar(400, 'Categoria inválida.');
  }
  const termo = prepararBusca(busca, MAX_BUSCA);

  let consulta = db()
    .from('produtos')
    .select(
      'id, nome, ativo, categoria_id, categorias(nome), produto_fotos(caminho, ordem), produto_variacoes(vende_unidade, preco_unidade_centavos, vende_fardo, preco_fardo_centavos)',
      { count: 'exact' },
    );
  if (categoria_id) consulta = consulta.eq('categoria_id', categoria_id);
  if (termo) consulta = consulta.ilike('nome', '%' + escaparLike(termo) + '%');

  const { linhas, total } = await buscarPagina(consulta.order('nome').order('id'), pag);
  const itens = linhas.map((p) => ({
    id: p.id,
    nome: p.nome,
    ativo: p.ativo,
    categoria_id: p.categoria_id,
    categoria_nome: p.categorias?.nome ?? null,
    foto_url: urlPublica([...p.produto_fotos].sort(porOrdem)[0]?.caminho),
    a_partir_de_centavos: menorPreco(p.produto_variacoes),
    total_variacoes: p.produto_variacoes.length,
  }));
  return { itens, total };
}

async function obter({ id }) {
  exigirId(id);
  const { data, error } = await db()
    .from('produtos')
    .select(
      'id, categoria_id, nome, descricao, ativo, produto_fotos(id, caminho, ordem), produto_variacoes(id, nome_tamanho, ordem, ativo, vende_unidade, preco_unidade_centavos, vende_fardo, qtd_por_fardo, preco_fardo_centavos)',
    )
    .eq('id', id)
    .maybeSingle();
  lancar(error);
  if (!data) falhar(404, 'Produto não encontrado.');
  const { produto_fotos: fotos, produto_variacoes: variacoes, ...produto } = data;
  return {
    ...produto,
    fotos: [...fotos]
      .sort(porOrdem)
      .map((f) => ({ id: f.id, ordem: f.ordem, url: urlPublica(f.caminho) })),
    variacoes: [...variacoes].sort(porOrdem),
  };
}

function validarOuFalhar(produto, variacoes) {
  const r = validarProduto({ produto, variacoes });
  if (!r.ok) falhar(400, 'Confira os campos informados.', r.campos);
  return r.valor;
}

// Grava produto + variações numa transação (RPC); traduz os erros do banco em respostas claras.
async function salvar(produto, variacoes) {
  const { data, error } = await db().rpc('admin_salvar_produto', {
    p_produto: produto,
    p_variacoes: variacoes,
  });
  if (error?.code === CODIGO_FK) {
    falhar(400, 'Categoria inválida.', { categoria_id: 'Escolha uma categoria existente.' });
  }
  if (error?.code === CODIGO_NAO_ENCONTRADO) falhar(404, 'Produto não encontrado.');
  if (error?.code === CODIGO_DADO_INVALIDO) falhar(400, 'Variação inválida para este produto.');
  lancar(error);
  return data;
}

async function criar({ produto, variacoes }) {
  const valor = validarOuFalhar(produto, variacoes);
  return obter({ id: await salvar(valor.produto, valor.variacoes) });
}

async function editar({ id, produto, variacoes }) {
  exigirId(id);
  const valor = validarOuFalhar(produto, variacoes);
  await salvar({ ...valor.produto, id }, valor.variacoes);
  return obter({ id });
}

async function excluir({ id }) {
  exigirId(id);
  const { data, error } = await db().from('produtos').select('id').eq('id', id).maybeSingle();
  lancar(error);
  if (!data) falhar(404, 'Produto não encontrado.');
  const { error: erroExcluir } = await db().from('produtos').delete().eq('id', id);
  lancar(erroExcluir);
  await removerPasta(id); // depois da linha: se o Storage falhar, só sobram arquivos órfãos (registrado)
  return { id };
}

const ACOES = { listar, obter, criar, editar, excluir };

servir(async (req, corpo) => {
  await exigirAdmin(req);
  const acao = Object.hasOwn(ACOES, corpo.acao) ? ACOES[corpo.acao] : null;
  if (!acao) falhar(400, 'Ação inválida.');
  return acao(corpo);
});
