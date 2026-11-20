import { db } from './db.js';

const BUCKET = 'produtos';
const MAX_ARQUIVOS_POR_PASTA = 1000;

const armazenamento = () => db().storage.from(BUCKET);

// Grava a imagem em `caminho` (sem sobrescrever) no bucket; devolve o próprio caminho.
export async function enviarObjeto(caminho, bytes, contentType) {
  const { error } = await armazenamento().upload(caminho, bytes, { contentType, upsert: false });
  if (error) throw new Error(error.message);
  return caminho;
}

// Grava a foto em `<produto_id>/<uuid>.<ext>`; devolve o caminho no bucket.
export function enviarArquivo(produtoId, bytes, { ext, contentType }) {
  return enviarObjeto(`${produtoId}/${crypto.randomUUID()}.${ext}`, bytes, contentType);
}

// Remoção "melhor esforço": falhas do Storage são registradas e não interrompem quem chamou.
export async function removerArquivos(caminhos) {
  if (caminhos.length === 0) return;
  const { error } = await armazenamento().remove(caminhos);
  if (error) console.error('Falha ao remover arquivos do Storage:', error.message);
}

// Remove todos os arquivos da pasta do produto (lista pelo prefixo `<produto_id>/`).
export async function removerPasta(produtoId) {
  const { data, error } = await armazenamento().list(produtoId, { limit: MAX_ARQUIVOS_POR_PASTA });
  if (error) {
    console.error('Falha ao listar arquivos do Storage:', error.message);
    return;
  }
  await removerArquivos(data.map((arquivo) => `${produtoId}/${arquivo.name}`));
}
