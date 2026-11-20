import {
  MAX_QTD_POR_FARDO,
  MIN_QTD_POR_FARDO,
  validarProduto,
} from '../../../supabase/functions/_shared/domain/produto.js';
import { formatarInteiro, formatarReais } from '../../shared/utils/formatar.js';

const CENTAVOS_POR_REAL = 100;
const MILESIMOS_POR_REAL = 1000;
const DECIMAIS_UNITARIO = 3;
const MSG_SEM_VARIACAO = 'Adicione ao menos um tamanho.';
const MSG_QTD_FARDO = `Informe quantas unidades vêm no fardo (mínimo ${MIN_QTD_POR_FARDO}).`;
export const MSG_SEM_FORMA_DE_VENDA = 'Escolha ao menos uma forma de venda.';
export const MSG_PRECO_INVALIDO = 'Informe um preço válido.';

let contadorDeChaves = 0;
// Identificador só do front (chave do React); o servidor nunca o vê.
const novaChave = () => `v${++contadorDeChaves}`;

export function variacaoVazia() {
  return {
    chave: novaChave(),
    id: null,
    ativo: true,
    nome_tamanho: '',
    vende_unidade: true,
    preco_unidade_centavos: null,
    vende_fardo: false,
    qtd_por_fardo: '',
    preco_fardo_centavos: null,
  };
}

export function formularioVazio() {
  return { nome: '', categoria_id: '', descricao: '', ativo: true, variacoes: [variacaoVazia()] };
}

// Produto devolvido por `admin-produtos` -> valores do formulário.
export function produtoParaFormulario(produto) {
  return {
    nome: produto.nome,
    categoria_id: produto.categoria_id,
    descricao: produto.descricao ?? '',
    ativo: produto.ativo,
    variacoes: produto.variacoes.map((v) => ({
      chave: novaChave(),
      id: v.id,
      ativo: v.ativo,
      nome_tamanho: v.nome_tamanho,
      vende_unidade: v.vende_unidade,
      preco_unidade_centavos: v.preco_unidade_centavos,
      vende_fardo: v.vende_fardo,
      qtd_por_fardo: v.qtd_por_fardo === null ? '' : String(v.qtd_por_fardo),
      preco_fardo_centavos: v.preco_fardo_centavos,
    })),
  };
}

function inteiroOuNulo(texto) {
  return /^\d+$/.test(String(texto).trim()) ? Number(texto) : null;
}

// Valores do formulário -> corpo de `criar`/`editar` (preços em centavos inteiros).
export function formularioParaPayload(formulario) {
  return {
    produto: {
      categoria_id: formulario.categoria_id,
      nome: formulario.nome,
      descricao: formulario.descricao,
      ativo: formulario.ativo,
    },
    variacoes: formulario.variacoes.map((v) => ({
      id: v.id,
      ativo: v.ativo,
      nome_tamanho: v.nome_tamanho,
      vende_unidade: v.vende_unidade,
      preco_unidade_centavos: v.vende_unidade ? v.preco_unidade_centavos : null,
      vende_fardo: v.vende_fardo,
      qtd_por_fardo: v.vende_fardo ? inteiroOuNulo(v.qtd_por_fardo) : null,
      preco_fardo_centavos: v.vende_fardo ? v.preco_fardo_centavos : null,
    })),
  };
}

// Texto estável dos dados editáveis (sem as chaves do front): serve para saber se algo mudou.
export const instantaneo = (formulario) => JSON.stringify(formularioParaPayload(formulario));

// Mensagens do domínio pensadas para a API ("em centavos") viram textos de quem digita em reais.
function amigavel(campo, mensagem) {
  if (campo === 'variacoes') return mensagem.startsWith('Cadastre') ? MSG_SEM_VARIACAO : mensagem;
  if (/^variacoes\.\d+$/.test(campo)) return MSG_SEM_FORMA_DE_VENDA;
  if (campo.endsWith('preco_unidade_centavos') || campo.endsWith('preco_fardo_centavos')) {
    return MSG_PRECO_INVALIDO;
  }
  if (campo.endsWith('qtd_por_fardo')) return MSG_QTD_FARDO;
  return mensagem;
}

// Erros por campo (do validador ou do servidor) com mensagens pensadas para o formulário.
export function traduzirCampos(campos) {
  return Object.fromEntries(
    Object.entries(campos).map(([campo, msg]) => [campo, amigavel(campo, msg)]),
  );
}

// Mesmas regras do servidor, para avisar na hora. -> { campo: mensagem } (vazio = tudo certo).
export function validarFormulario(formulario) {
  const resultado = validarProduto(formularioParaPayload(formulario));
  return resultado.ok ? {} : traduzirCampos(resultado.campos);
}

function quantidadeValida(texto) {
  const n = inteiroOuNulo(texto);
  return n !== null && n >= MIN_QTD_POR_FARDO && n <= MAX_QTD_POR_FARDO ? n : null;
}

// "R$ 0,085": até 3 casas, mas mantém ao menos 2 (R$ 1,50, não R$ 1,500).
function formatarMilesimos(milesimos) {
  const reais = formatarInteiro(Math.floor(milesimos / MILESIMOS_POR_REAL));
  let decimais = String(milesimos % MILESIMOS_POR_REAL).padStart(DECIMAIS_UNITARIO, '0');
  if (decimais.endsWith('0')) decimais = decimais.slice(0, -1);
  return `R$ ${reais},${decimais}`;
}

// Quanto custa cada unidade dentro do fardo (8500 centavos / 1000 un -> "R$ 0,085 por unidade no fardo").
// -> { texto, maisBarato, unidade } ou null se faltar dado. `maisBarato` só deixa de ser true quando
// a unidade avulsa também é vendida e o fardo não sai mais barato por unidade (aviso, não erro).
export function resumoDoFardo(variacao) {
  const qtd = quantidadeValida(variacao.qtd_por_fardo);
  const precoFardo = variacao.preco_fardo_centavos;
  if (!variacao.vende_fardo || qtd === null || !(precoFardo > 0)) return null;
  const milesimos = Math.round((precoFardo * (MILESIMOS_POR_REAL / CENTAVOS_POR_REAL)) / qtd);
  const precoUnidade = variacao.preco_unidade_centavos;
  const comparavel = variacao.vende_unidade && precoUnidade > 0;
  return {
    texto: `${formatarMilesimos(milesimos)} por unidade no fardo`,
    // Comparação exata em inteiros: fardo é mais barato por unidade se fardo < unidade * quantidade.
    maisBarato: !comparavel || precoFardo < precoUnidade * qtd,
    unidade: comparavel ? formatarReais(precoUnidade) : null,
  };
}
