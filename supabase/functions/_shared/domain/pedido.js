// Pedido: validação do carrinho, revisão contra os preços do banco e mensagem do WhatsApp.
// Módulo puro: sem imports de Deno/npm, reaproveitado pelo front-end.

import { formatarInteiro, formatarReais } from './dinheiro.js';
import { formatarCnpj, formatarTelefone, somenteDigitos } from './documento.js';

export const LIMITE_ITENS = 200;
export const QUANTIDADE_MINIMA = 1;
export const QUANTIDADE_MAXIMA = 99999;
export const FORMA_UNIDADE = 'unidade';
export const FORMA_FARDO = 'fardo';

const FORMAS = [FORMA_UNIDADE, FORMA_FARDO];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DDI_BRASIL = '55';
const TAMANHOS_NUMERO_SEM_DDI = [10, 11];
const SEPARADOR = ' — ';

const MSG_CARRINHO_INVALIDO = 'Carrinho inválido.';
const MSG_CARRINHO_VAZIO = 'O carrinho está vazio.';
const MSG_QUANTIDADE = `Quantidade inválida: use um número inteiro de ${QUANTIDADE_MINIMA} a ${QUANTIDADE_MAXIMA}.`;
const MSG_QUANTIDADE_SOMADA = `A soma das quantidades de um mesmo produto não pode passar de ${QUANTIDADE_MAXIMA}.`;

// Surrogates UTF-16 soltos fariam encodeURIComponent lançar URIError.
const SUBSTITUTO_SOLTO = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
const CARACTERE_SUBSTITUTO = '�';

const chaveItem = (variacaoId, forma) => `${variacaoId}:${forma}`;

/**
 * Troca surrogates UTF-16 soltos por U+FFFD, para o texto sempre poder ser codificado em URL.
 * @param {unknown} valor
 * @returns {string}
 */
export function textoBemFormado(valor) {
  return String(valor ?? '').replace(SUBSTITUTO_SOLTO, CARACTERE_SUBSTITUTO);
}

function ehObjeto(valor) {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function quantidadeValida(q) {
  return Number.isInteger(q) && q >= QUANTIDADE_MINIMA && q <= QUANTIDADE_MAXIMA;
}

function validarItem(bruto, indice) {
  const posicao = `Item ${indice + 1}`;
  if (!ehObjeto(bruto)) return { erro: `${posicao}: item inválido.` };
  if (typeof bruto.variacao_id !== 'string' || !UUID.test(bruto.variacao_id)) {
    return { erro: `${posicao}: produto inválido.` };
  }
  if (!FORMAS.includes(bruto.forma)) return { erro: `${posicao}: forma de venda inválida.` };
  if (!quantidadeValida(bruto.quantidade)) return { erro: `${posicao}: ${MSG_QUANTIDADE}` };
  return {
    item: { variacao_id: bruto.variacao_id, forma: bruto.forma, quantidade: bruto.quantidade },
  };
}

// Junta linhas repetidas (mesma variação e forma) somando as quantidades, na ordem da 1ª ocorrência.
function mesclarRepetidos(itens) {
  const porChave = new Map();
  for (const { variacao_id, forma, quantidade } of itens) {
    const chave = chaveItem(variacao_id, forma);
    const existente = porChave.get(chave);
    if (existente) existente.quantidade += quantidade;
    else porChave.set(chave, { variacao_id, forma, quantidade });
  }
  return [...porChave.values()];
}

/**
 * Valida os itens do carrinho recebido do navegador. Campos desconhecidos são descartados.
 * Linhas repetidas (mesma variação e forma) não podem somar mais que a quantidade máxima.
 * @param {unknown} itens Lista de `{ variacao_id, forma, quantidade }`.
 * @returns {{ ok: true, itens: object[] } | { ok: false, erro: string }}
 */
export function validarItensCarrinho(itens) {
  if (!Array.isArray(itens)) return { ok: false, erro: MSG_CARRINHO_INVALIDO };
  if (itens.length === 0) return { ok: false, erro: MSG_CARRINHO_VAZIO };
  if (itens.length > LIMITE_ITENS) {
    return { ok: false, erro: `O carrinho aceita no máximo ${LIMITE_ITENS} itens.` };
  }
  const validados = [];
  for (let i = 0; i < itens.length; i += 1) {
    const { item, erro } = validarItem(itens[i], i);
    if (erro) return { ok: false, erro };
    validados.push(item);
  }
  if (mesclarRepetidos(validados).some((i) => i.quantidade > QUANTIDADE_MAXIMA)) {
    return { ok: false, erro: MSG_QUANTIDADE_SOMADA };
  }
  return { ok: true, itens: validados };
}

function precoDaForma(variacao, forma) {
  const preco =
    forma === FORMA_FARDO ? variacao.preco_fardo_centavos : variacao.preco_unidade_centavos;
  return Number.isInteger(preco) && preco > 0 ? preco : null;
}

function formaVendida(variacao, forma) {
  if (forma === FORMA_FARDO) {
    return variacao.vende_fardo === true && Number.isInteger(variacao.qtd_por_fardo);
  }
  return variacao.vende_unidade === true;
}

function disponivel(variacao, forma) {
  return (
    Boolean(variacao) &&
    variacao.ativo === true &&
    variacao.produto?.ativo === true &&
    formaVendida(variacao, forma) &&
    precoDaForma(variacao, forma) !== null
  );
}

function montarItemRevisado({ variacao_id, forma, quantidade }, variacao, preco) {
  const revisado = {
    variacao_id,
    forma,
    quantidade,
    produto_nome: variacao.produto.nome,
    nome_tamanho: variacao.nome_tamanho,
  };
  if (forma === FORMA_FARDO) revisado.qtd_por_fardo = variacao.qtd_por_fardo;
  revisado.preco_centavos = preco;
  revisado.subtotal_centavos = preco * quantidade;
  return revisado;
}

/**
 * Confere os itens do carrinho contra os dados do banco. Do carrinho só são usados
 * variacao_id, forma e quantidade (e `precosVistos`, apenas para detectar mudança de preço);
 * nome, tamanho e preço vêm sempre do banco. Linhas repetidas (mesma variação e forma)
 * são mescladas somando as quantidades. Subtotal ou total fora do inteiro seguro tornam
 * o item indisponível.
 * @param {{variacao_id: string, forma: string, quantidade: number}[]} itens Itens já validados.
 * @param {object[]} variacoesDoBanco Linhas de produto_variacoes com `produto: { nome, ativo }`.
 * @param {Record<string, number>} [precosVistos] `{ '<variacao_id>:<forma>': centavos }`.
 * @returns {{ itens: object[], divergencias: object[], total_centavos: number }}
 */
export function revisarItens(itens, variacoesDoBanco, precosVistos = {}) {
  const porId = new Map((variacoesDoBanco ?? []).map((v) => [v.id, v]));
  const revisados = [];
  const divergencias = [];
  let total_centavos = 0;
  for (const itemCarrinho of mesclarRepetidos(itens)) {
    const { variacao_id, forma } = itemCarrinho;
    const variacao = porId.get(variacao_id);
    if (!disponivel(variacao, forma)) {
      divergencias.push({ variacao_id, forma, tipo: 'indisponivel' });
      continue;
    }
    const preco = precoDaForma(variacao, forma);
    const subtotal = preco * itemCarrinho.quantidade;
    if (!Number.isSafeInteger(subtotal) || !Number.isSafeInteger(total_centavos + subtotal)) {
      divergencias.push({ variacao_id, forma, tipo: 'indisponivel' });
      continue;
    }
    const visto = precosVistos?.[chaveItem(variacao_id, forma)];
    if (Number.isInteger(visto) && visto !== preco) {
      divergencias.push({
        variacao_id,
        forma,
        tipo: 'preco_mudou',
        preco_anterior_centavos: visto,
        preco_atual_centavos: preco,
      });
    }
    total_centavos += subtotal;
    revisados.push(montarItemRevisado(itemCarrinho, variacao, preco));
  }
  return { itens: revisados, divergencias, total_centavos };
}

const texto = (valor) => textoBemFormado(valor).trim();
// Dados digitados pelo visitante: uma linha só, para não forjar linhas na mensagem.
const linha = (valor) => texto(valor).replace(/\s+/g, ' ');

function formatarCep(valor) {
  const d = somenteDigitos(valor);
  return d.length === 8 ? d.replace(/^(\d{5})(\d{3})$/, '$1-$2') : d;
}

function linhaEndereco(c) {
  const ruaNumero = [linha(c.rua), linha(c.numero), linha(c.complemento)]
    .filter(Boolean)
    .join(', ');
  const cidadeUf = [linha(c.cidade), linha(c.uf)].filter(Boolean).join('/');
  const cep = formatarCep(c.cep);
  return [ruaNumero, linha(c.bairro), cidadeUf, cep && `CEP ${cep}`]
    .filter(Boolean)
    .join(SEPARADOR);
}

function blocoCliente(c) {
  const linhas = [`👤 *Cliente:* ${linha(c.nome)}`];
  if (c.tipo_pessoa === 'PJ') {
    linhas.push(
      `🪪 CNPJ: ${formatarCnpj(c.cpf_cnpj)}${SEPARADOR}Razão social: ${linha(c.razao_social)}`,
    );
  }
  if (linha(c.telefone)) linhas.push(`📞 ${formatarTelefone(texto(c.telefone))}`);
  const endereco = linhaEndereco(c);
  if (endereco) linhas.push(`📍 ${endereco}`);
  return linhas;
}

function linhaItem(i) {
  const partes = [`${i.quantidade}x ${texto(i.produto_nome)}`];
  if (texto(i.nome_tamanho)) partes.push(`Tam. ${texto(i.nome_tamanho)}`);
  partes.push(
    i.forma === FORMA_FARDO ? `Fardo (${formatarInteiro(i.qtd_por_fardo)} un.)` : 'Unidade',
  );
  partes.push(`${formatarReais(i.preco_centavos)} = ${formatarReais(i.subtotal_centavos)}`);
  return `• ${partes.join(SEPARADOR)}`;
}

/**
 * Monta o texto do pedido para o WhatsApp (PF sem documento; PJ com CNPJ e razão social;
 * nunca inclui e-mail).
 * @param {{ empresa: object, cliente: object, itens: object[], total_centavos: number, observacao?: string }} pedido
 * @returns {string}
 */
export function montarMensagem({ empresa, cliente, itens, total_centavos, observacao }) {
  const linhas = [
    `🛒 *NOVO PEDIDO${SEPARADOR}${texto(empresa?.nome)}*`,
    '',
    ...blocoCliente(cliente),
    '',
    '*Itens:*',
    ...itens.map(linhaItem),
    '',
    `💰 *Total: ${formatarReais(total_centavos)}*`,
  ];
  const obs = texto(observacao);
  if (obs) linhas.push(`📝 Obs: ${obs}`);
  const rodape = texto(empresa?.rodape_mensagem);
  if (rodape) linhas.push('', rodape);
  return linhas.join('\n');
}

/**
 * Monta o link wa.me com o texto codificado.
 * @param {string} numero Número do WhatsApp, com ou sem máscara/DDI.
 * @param {string} mensagem Texto do pedido.
 * @returns {string} `https://wa.me/<dígitos>?text=<texto codificado>`.
 */
export function linkWhatsapp(numero, mensagem) {
  let digitos = somenteDigitos(numero);
  if (TAMANHOS_NUMERO_SEM_DDI.includes(digitos.length)) digitos = DDI_BRASIL + digitos;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(textoBemFormado(mensagem))}`;
}
