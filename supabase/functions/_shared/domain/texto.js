// Escapa os curingas do LIKE/ILIKE (`\`, `%`, `_`) para que a busca do usuário seja literal.
export function escaparLike(texto) {
  return String(texto).replace(/[\\%_]/g, (c) => `\\${c}`);
}

// Termo de busca seguro para `.ilike`: sem `*` (o PostgREST o converte em `%`), aparado e limitado.
export function prepararBusca(busca, maximo) {
  if (typeof busca !== 'string') return '';
  return busca.replaceAll('*', '').trim().slice(0, maximo);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ehUuid(valor) {
  return typeof valor === 'string' && UUID.test(valor);
}

export const TAMANHO_MAXIMO_SLUG = 60;
const SLUG_PADRAO = 'categoria';

// "Água & Sucos" -> "agua-sucos": minúsculas, sem acentos, só [a-z0-9] separados por '-'.
export function gerarSlug(texto) {
  const slug = String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, TAMANHO_MAXIMO_SLUG)
    .replace(/^-+|-+$/g, '');
  return slug || SLUG_PADRAO;
}

// Escolhe `base`, `base-2`, `base-3`... que não esteja em `existentes`, respeitando o tamanho máximo.
export function slugUnico(base, existentes) {
  const usados = new Set(existentes);
  if (!usados.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const sufixo = `-${n}`;
    const candidato =
      base.slice(0, TAMANHO_MAXIMO_SLUG - sufixo.length).replace(/-+$/g, '') + sufixo;
    if (!usados.has(candidato)) return candidato;
  }
}

// Quantos caracteres do fim do slug podem ser trocados pelo sufixo `-N` (até `-999`).
const RESERVA_SUFIXO_SLUG = 4;

// Prefixo comum a `base` e a todos os candidatos de `slugUnico` (que truncam a base para caber
// o sufixo). Use-o na busca por slugs existentes: buscar pela base inteira perde os truncados.
export function prefixoSlug(base) {
  return base.slice(0, TAMANHO_MAXIMO_SLUG - RESERVA_SUFIXO_SLUG);
}
