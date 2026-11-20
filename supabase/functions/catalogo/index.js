import { db, urlPublica } from '../_shared/infra/db.js';
import { falhar, servir } from '../_shared/infra/http.js';
import { buscarPagina, lerPagina } from '../_shared/infra/paginacao.js';
import { menorPreco } from '../_shared/domain/produto.js';
import { ehUuid, escaparLike, prepararBusca } from '../_shared/domain/texto.js';

const MAX_BUSCA = 80;

function lancar(error) {
  if (error) throw new Error(error.message);
}

const porOrdem = (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0);

async function categorias() {
  const { data, error } = await db()
    .from('categorias')
    .select('id, nome, slug')
    .eq('ativo', true)
    .order('ordem')
    .order('nome');
  lancar(error);
  return data;
}

async function produtos({ categoria_slug, busca, pagina }) {
  const pag = lerPagina(pagina);
  const termo = prepararBusca(busca, MAX_BUSCA);

  let categoriaId = null;
  if (typeof categoria_slug === 'string' && categoria_slug) {
    const { data, error } = await db()
      .from('categorias')
      .select('id')
      .eq('slug', categoria_slug)
      .eq('ativo', true)
      .maybeSingle();
    lancar(error);
    if (!data) return { itens: [], total: 0 };
    categoriaId = data.id;
  }

  // Só entram produtos ativos, de categoria ativa, com ao menos uma variação ativa.
  let consulta = db()
    .from('produtos')
    .select(
      'id, nome, categorias!inner(ativo), produto_variacoes!inner(vende_unidade, preco_unidade_centavos, vende_fardo, preco_fardo_centavos, ativo), produto_fotos(caminho, ordem)',
      { count: 'exact' },
    )
    .eq('ativo', true)
    .eq('categorias.ativo', true)
    .eq('produto_variacoes.ativo', true);
  if (categoriaId) consulta = consulta.eq('categoria_id', categoriaId);
  if (termo) consulta = consulta.ilike('nome', '%' + escaparLike(termo) + '%');

  const { linhas, total } = await buscarPagina(consulta.order('nome').order('id'), pag);

  const itens = linhas.map((p) => {
    const foto = [...p.produto_fotos].sort(porOrdem)[0];
    return {
      id: p.id,
      nome: p.nome,
      foto_url: urlPublica(foto?.caminho),
      a_partir_de_centavos: menorPreco(p.produto_variacoes),
    };
  });
  return { itens, total };
}

async function produto({ id }) {
  if (!ehUuid(id)) falhar(400, 'Produto inválido.');
  const { data, error } = await db()
    .from('produtos')
    .select(
      'id, nome, descricao, categorias!inner(id, nome, slug, ativo), produto_fotos(caminho, ordem), produto_variacoes(id, nome_tamanho, ordem, ativo, vende_unidade, preco_unidade_centavos, vende_fardo, qtd_por_fardo, preco_fardo_centavos)',
    )
    .eq('id', id)
    .eq('ativo', true)
    .eq('categorias.ativo', true)
    .maybeSingle();
  lancar(error);
  if (!data) falhar(404, 'Produto não encontrado.');
  return {
    id: data.id,
    nome: data.nome,
    descricao: data.descricao,
    categoria: { id: data.categorias.id, nome: data.categorias.nome, slug: data.categorias.slug },
    fotos: [...data.produto_fotos].sort(porOrdem).map((f) => urlPublica(f.caminho)),
    variacoes: data.produto_variacoes
      .filter((v) => v.ativo)
      .sort(porOrdem)
      .map((v) => ({ ...v, ativo: undefined })),
  };
}

const ACOES = { categorias, produtos, produto };

servir(async (_req, corpo) => {
  const acao = Object.hasOwn(ACOES, corpo.acao) ? ACOES[corpo.acao] : null;
  if (!acao) falhar(400, 'Ação inválida.');
  return acao(corpo);
});
