// Regras do limite de tentativas (login, recuperação de senha e pedido).
// Módulo puro: sem imports de Deno/npm; o acesso ao banco fica em infra/rateLimitRepo.js.

const MS_POR_MINUTO = 60 * 1000;
const MAX_RECUPERAR_POR_IP = 10;
const MAX_PEDIDOS_POR_IP = 20;

// `apenasFalhas`: conta só tentativas com sucesso=false. `chaves`: colunas que identificam o
// solicitante; cada chave é avaliada separadamente (basta uma estourar para bloquear).
// `maxPorChave` (opcional) troca `maxFalhas` para uma chave específica.
export const LIMITES = {
  login: {
    maxFalhas: 5,
    janelaMin: 15,
    bloqueioMin: 15,
    apenasFalhas: true,
    chaves: ['email', 'ip'],
  },
  recuperar: {
    maxFalhas: 3,
    maxPorChave: { ip: MAX_RECUPERAR_POR_IP },
    janelaMin: 60,
    bloqueioMin: 60,
    apenasFalhas: false,
    chaves: ['email', 'ip'],
  },
  // Pedido sem conta: até 20 por hora por IP (todas as tentativas contam).
  pedido: {
    maxFalhas: MAX_PEDIDOS_POR_IP,
    maxPorChave: { ip: MAX_PEDIDOS_POR_IP },
    janelaMin: 60,
    bloqueioMin: 60,
    apenasFalhas: false,
    chaves: ['ip'],
  },
};

const PADRAO = LIMITES.login;

function instante(tentativa) {
  return new Date(tentativa.criado_em).getTime();
}

/**
 * Decide se o solicitante está bloqueado.
 *
 * @param {Array<{criado_em: string}>} tentativas Tentativas já filtradas (ex.: só as falhas).
 * @param {Date} agora
 * @param {{ maxFalhas?: number, janelaMin?: number, bloqueioMin?: number }} [opcoes]
 * @returns {{ bloqueado: boolean, liberaEm?: Date }} `liberaEm` = última tentativa + bloqueioMin.
 */
export function avaliarBloqueio(
  tentativas,
  agora,
  {
    maxFalhas = PADRAO.maxFalhas,
    janelaMin = PADRAO.janelaMin,
    bloqueioMin = PADRAO.bloqueioMin,
  } = {},
) {
  const inicioJanela = agora.getTime() - janelaMin * MS_POR_MINUTO;
  const naJanela = tentativas.map(instante).filter((t) => t >= inicioJanela);
  if (naJanela.length < maxFalhas) return { bloqueado: false };

  const liberaEm = new Date(Math.max(...naJanela) + bloqueioMin * MS_POR_MINUTO);
  return liberaEm.getTime() > agora.getTime()
    ? { bloqueado: true, liberaEm }
    : { bloqueado: false };
}

/**
 * Monta o plano da consulta de uma ação: limites, chaves e o início da janela (ISO).
 *
 * @param {'login'|'recuperar'|'pedido'} acao
 * @param {Date} [agora]
 */
export function janelaDaAcao(acao, agora = new Date()) {
  const limite = LIMITES[acao];
  if (!limite) throw new Error(`Ação de limite desconhecida: ${acao}`);
  const desde = new Date(agora.getTime() - limite.janelaMin * MS_POR_MINUTO).toISOString();
  return { ...limite, desde };
}

/** E-mail em minúsculas e sem espaços; vazio vira null. */
export function normalizarEmail(email) {
  const texto = typeof email === 'string' ? email.trim().toLowerCase() : '';
  return texto || null;
}

const OCTETO_MAX = 255;
const REGEX_IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const REGEX_IPV6 = /^[0-9a-f:.]+$/i;

function formatoDeIp(valor) {
  if (REGEX_IPV4.test(valor)) return valor.split('.').every((o) => Number(o) <= OCTETO_MAX);
  return REGEX_IPV6.test(valor) && valor.includes(':');
}

function ipValido(valor) {
  const ip = (valor ?? '').trim();
  return formatoDeIp(ip) ? ip : null;
}

/**
 * IP do cliente. Ordem: `cf-connecting-ip`; senão o ÚLTIMO item de `x-forwarded-for` (os
 * proxies acrescentam ao fim; o primeiro item pode ser forjado pelo cliente); senão null.
 * Quando for null, a chave de IP NÃO é aplicada (não existe balde compartilhado "desconhecido").
 *
 * @param {{ headers: { get(nome: string): string | null } }} req Requisição Fetch.
 * @returns {string | null}
 */
export function ipDaRequisicao(req) {
  const cloudflare = ipValido(req.headers.get('cf-connecting-ip'));
  if (cloudflare) return cloudflare;
  const itens = (req.headers.get('x-forwarded-for') ?? '').split(',');
  return ipValido(itens[itens.length - 1]);
}
