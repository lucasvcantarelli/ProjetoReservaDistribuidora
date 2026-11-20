// Validação do produto e das variações (admin). Preços chegam como centavos inteiros.
// Espelha o CHECK de `produto_variacoes`. Módulo puro: sem imports de Deno/npm.
import { ehUuid } from './texto.js';

export const MAX_NOME_PRODUTO = 120;
export const MAX_DESCRICAO = 2000;
export const MAX_NOME_TAMANHO = 40;
export const MAX_VARIACOES = 30;
export const MAX_FOTOS = 10;
export const MAX_CENTAVOS = 100_000_000;
export const MAX_QTD_POR_FARDO = 99_999;
export const MIN_QTD_POR_FARDO = 2;

const MSG_OBRIGATORIO = 'Campo obrigatório.';
const MSG_CENTAVOS = 'Informe o preço em centavos (número inteiro maior que zero).';

const ehObjeto = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

function textoLimitado(valor, maximo, { obrigatorio }) {
  if (valor === undefined || valor === null) {
    return obrigatorio ? { erro: MSG_OBRIGATORIO } : { valor: '' };
  }
  if (typeof valor !== 'string') return { erro: 'Texto inválido.' };
  const texto = valor.trim();
  if (obrigatorio && !texto) return { erro: MSG_OBRIGATORIO };
  if (texto.length > maximo) return { erro: `Use no máximo ${maximo} caracteres.` };
  return { valor: texto };
}

function centavosValidos(valor) {
  return Number.isInteger(valor) && valor > 0 && valor <= MAX_CENTAVOS;
}

function validarDadosProduto(produto, campos) {
  if (!ehObjeto(produto)) {
    campos.nome = MSG_OBRIGATORIO;
    return null;
  }
  const nome = textoLimitado(produto.nome, MAX_NOME_PRODUTO, { obrigatorio: true });
  if (nome.erro) campos.nome = nome.erro;
  const descricao = textoLimitado(produto.descricao, MAX_DESCRICAO, { obrigatorio: false });
  if (descricao.erro) campos.descricao = descricao.erro;
  if (!ehUuid(produto.categoria_id)) campos.categoria_id = 'Escolha uma categoria.';
  if (produto.ativo !== undefined && typeof produto.ativo !== 'boolean') {
    campos.ativo = 'Valor inválido.';
  }
  return {
    categoria_id: produto.categoria_id,
    nome: nome.valor,
    descricao: descricao.valor,
    ativo: produto.ativo ?? true,
  };
}

function validarFormaUnidade(v, prefixo, campos) {
  if (!v.vende_unidade) return { preco_unidade_centavos: null };
  if (!centavosValidos(v.preco_unidade_centavos)) {
    campos[`${prefixo}.preco_unidade_centavos`] = MSG_CENTAVOS;
  }
  return { preco_unidade_centavos: v.preco_unidade_centavos };
}

function validarFormaFardo(v, prefixo, campos) {
  if (!v.vende_fardo) return { qtd_por_fardo: null, preco_fardo_centavos: null };
  if (!centavosValidos(v.preco_fardo_centavos)) {
    campos[`${prefixo}.preco_fardo_centavos`] = MSG_CENTAVOS;
  }
  const qtd = v.qtd_por_fardo;
  if (!Number.isInteger(qtd) || qtd < MIN_QTD_POR_FARDO || qtd > MAX_QTD_POR_FARDO) {
    campos[`${prefixo}.qtd_por_fardo`] =
      `A quantidade por fardo deve ser um inteiro entre ${MIN_QTD_POR_FARDO} e ${MAX_QTD_POR_FARDO}.`;
  }
  return { qtd_por_fardo: qtd, preco_fardo_centavos: v.preco_fardo_centavos };
}

function validarFlagsBooleanas(v, prefixo, campos) {
  for (const flag of ['ativo', 'vende_unidade', 'vende_fardo']) {
    if (v[flag] !== undefined && typeof v[flag] !== 'boolean') {
      campos[`${prefixo}.${flag}`] = 'Valor inválido.';
    }
  }
}

function validarVariacao(v, indice, campos) {
  const prefixo = `variacoes.${indice}`;
  if (!ehObjeto(v)) {
    campos[prefixo] = 'Variação inválida.';
    return null;
  }
  if (v.id !== undefined && v.id !== null && !ehUuid(v.id)) {
    campos[`${prefixo}.id`] = 'Id inválido.';
  }
  const nome = textoLimitado(v.nome_tamanho, MAX_NOME_TAMANHO, { obrigatorio: true });
  if (nome.erro) campos[`${prefixo}.nome_tamanho`] = nome.erro;
  validarFlagsBooleanas(v, prefixo, campos);
  const vendeUnidade = v.vende_unidade === true;
  const vendeFardo = v.vende_fardo === true;
  if (!vendeUnidade && !vendeFardo) {
    campos[prefixo] = 'Informe se a variação é vendida por unidade, por fardo ou ambos.';
  }
  return {
    id: v.id ?? null,
    nome_tamanho: nome.valor,
    ordem: indice,
    ativo: v.ativo ?? true,
    vende_unidade: vendeUnidade,
    vende_fardo: vendeFardo,
    ...validarFormaUnidade({ ...v, vende_unidade: vendeUnidade }, prefixo, campos),
    ...validarFormaFardo({ ...v, vende_fardo: vendeFardo }, prefixo, campos),
  };
}

function validarListaVariacoes(variacoes, campos) {
  if (!Array.isArray(variacoes) || variacoes.length === 0) {
    campos.variacoes = 'Cadastre ao menos uma variação.';
    return [];
  }
  if (variacoes.length > MAX_VARIACOES) {
    campos.variacoes = `Use no máximo ${MAX_VARIACOES} variações.`;
    return [];
  }
  const lista = variacoes.map((v, i) => validarVariacao(v, i, campos));
  const ids = lista.map((v) => v?.id).filter(Boolean);
  if (new Set(ids).size !== ids.length) campos.variacoes = 'Variação repetida.';
  return lista;
}

/**
 * @param {{produto: object, variacoes: object[]}} entrada
 * @returns {{ok: true, valor: {produto: object, variacoes: object[]}} | {ok: false, campos: object}}
 */
export function validarProduto({ produto, variacoes } = {}) {
  const campos = {};
  const dadosProduto = validarDadosProduto(produto, campos);
  const lista = validarListaVariacoes(variacoes, campos);
  if (Object.keys(campos).length > 0) return { ok: false, campos };
  return { ok: true, valor: { produto: dadosProduto, variacoes: lista } };
}

// Menor preço positivo entre as formas vendidas (unidade ou fardo) das variações informadas.
export function menorPreco(variacoes) {
  const precos = [];
  for (const v of variacoes) {
    if (v.vende_unidade && v.preco_unidade_centavos > 0) precos.push(v.preco_unidade_centavos);
    if (v.vende_fardo && v.preco_fardo_centavos > 0) precos.push(v.preco_fardo_centavos);
  }
  return precos.length ? Math.min(...precos) : null;
}
