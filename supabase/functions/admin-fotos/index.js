import { db, urlPublica } from '../_shared/infra/db.js';
import { exigirAdmin } from '../_shared/infra/auth.js';
import { falhar, servir } from '../_shared/infra/http.js';
import { lancar } from '../_shared/infra/erroBanco.js';
import { enviarArquivo, removerArquivos } from '../_shared/infra/fotosStorage.js';
import { LIMITE_IMAGEM_BYTES, validarImagem } from '../_shared/domain/imagem.js';
import { MAX_FOTOS } from '../_shared/domain/produto.js';
import { ehUuid } from '../_shared/domain/texto.js';

const LIMITE_MULTIPART_BYTES = LIMITE_IMAGEM_BYTES + 1024 * 1024; // arquivo + campos do formulário
const COLUNAS = 'id, produto_id, caminho, ordem';

const fotoPublica = (f) => ({
  id: f.id,
  produto_id: f.produto_id,
  ordem: f.ordem,
  url: urlPublica(f.caminho),
});

async function fotosDoProduto(produtoId) {
  const { data, error } = await db()
    .from('produto_fotos')
    .select(COLUNAS)
    .eq('produto_id', produtoId)
    .order('ordem');
  lancar(error);
  return data;
}

async function exigirProduto(produtoId) {
  if (!ehUuid(produtoId)) falhar(400, 'Produto inválido.');
  const { data, error } = await db()
    .from('produtos')
    .select('id')
    .eq('id', produtoId)
    .maybeSingle();
  lancar(error);
  if (!data) falhar(404, 'Produto não encontrado.');
}

async function enviar(formulario) {
  const produtoId = formulario.get('produto_id');
  await exigirProduto(produtoId);
  const existentes = await fotosDoProduto(produtoId);
  if (existentes.length >= MAX_FOTOS) falhar(400, `Limite de ${MAX_FOTOS} fotos por produto.`);

  const arquivo = formulario.get('arquivo');
  if (!(arquivo instanceof Blob)) falhar(400, 'Envie uma imagem.');
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const imagem = validarImagem(bytes);
  if (!imagem.ok) falhar(400, imagem.erro);

  const caminho = await enviarArquivo(produtoId, bytes, imagem);
  const ordem = existentes.reduce((maior, f) => Math.max(maior, f.ordem ?? 0), 0) + 1;
  const { data, error } = await db()
    .from('produto_fotos')
    .insert({ produto_id: produtoId, caminho, ordem })
    .select(COLUNAS)
    .single();
  if (error) {
    await removerArquivos([caminho]);
    throw new Error(error.message);
  }
  return fotoPublica(data);
}

async function remover({ id }) {
  if (!ehUuid(id)) falhar(400, 'Foto inválida.');
  const { data, error } = await db().from('produto_fotos').delete().eq('id', id).select(COLUNAS);
  lancar(error);
  if (data.length === 0) falhar(404, 'Foto não encontrada.');
  await removerArquivos([data[0].caminho]);
  return { id };
}

async function reordenar({ produto_id, ids }) {
  await exigirProduto(produto_id);
  const fotos = await fotosDoProduto(produto_id);
  const mesmoConjunto =
    Array.isArray(ids) &&
    ids.length === fotos.length &&
    new Set(ids).size === ids.length &&
    ids.every((id) => fotos.some((f) => f.id === id));
  if (!mesmoConjunto) falhar(400, 'Lista de fotos inválida.');
  for (const [indice, id] of ids.entries()) {
    const { error } = await db()
      .from('produto_fotos')
      .update({ ordem: indice + 1 })
      .eq('id', id);
    lancar(error);
  }
  return (await fotosDoProduto(produto_id)).map(fotoPublica);
}

const ACOES_JSON = { remover, reordenar };

servir(
  async (req, corpo, contexto) => {
    await exigirAdmin(req);
    if (contexto.multipart) return enviar(await contexto.formData());
    const acao = Object.hasOwn(ACOES_JSON, corpo.acao) ? ACOES_JSON[corpo.acao] : null;
    if (!acao) falhar(400, 'Ação inválida.');
    return acao(corpo);
  },
  { aceitarMultipart: true, limiteBytes: LIMITE_MULTIPART_BYTES },
);
