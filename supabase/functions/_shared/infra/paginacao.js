// Paginação comum das listagens (catálogo e admin): 24 itens por página.
import { falhar } from './http.js';

export const TAMANHO_PAGINA = 24;
const MAX_PAGINA = 10000;

// Valida o número da página (padrão 1) ou responde 400.
export function lerPagina(pagina) {
  const pag = pagina ?? 1;
  if (!Number.isInteger(pag) || pag < 1 || pag > MAX_PAGINA) falhar(400, 'Página inválida.');
  return pag;
}

// Executa a consulta (já ordenada, com `count: 'exact'`) na página pedida.
// Página além do fim devolve lista vazia, mantendo o total.
export async function buscarPagina(consultaOrdenada, pag) {
  const de = (pag - 1) * TAMANHO_PAGINA;
  let { data, error, count } = await consultaOrdenada.range(de, de + TAMANHO_PAGINA - 1);
  if (error?.code === 'PGRST103') {
    ({ count, error } = await consultaOrdenada.range(0, 0));
    if (error) throw new Error(error.message);
    return { linhas: [], total: count ?? 0 };
  }
  if (error) throw new Error(error.message);
  return { linhas: data, total: count ?? data.length };
}
