import { storage } from '../../shared/services/storage.js';
import {
  TAMANHO_MAXIMO,
  TIPOS_PESSOA,
  UFS,
} from '../../../supabase/functions/_shared/domain/cadastro.js';

export const CHAVE_DADOS_CLIENTE = 'reserva.dados-cliente';
// Chaves de quando a loja tinha conta de cliente: não servem mais e podem guardar tokens antigos.
const CHAVES_LEGADAS = ['reserva.sessao.cliente'];
const VERSAO = 1;
const TAMANHO_MAXIMO_DOCUMENTO = 18; // CNPJ com máscara
const TAMANHO_MAXIMO_TELEFONE = 15;
const TAMANHO_MAXIMO_CEP = 9;

export const CAMPOS_IDENTIFICACAO = [
  'razao_social',
  'cnpj',
  'nome',
  'telefone',
  'cep',
  'uf',
  'rua',
  'numero',
  'complemento',
  'bairro',
  'cidade',
];

const LIMITES = {
  ...TAMANHO_MAXIMO,
  cnpj: TAMANHO_MAXIMO_DOCUMENTO,
  telefone: TAMANHO_MAXIMO_TELEFONE,
  cep: TAMANHO_MAXIMO_CEP,
  uf: 2,
};

export const IDENTIFICACAO_VAZIA = Object.freeze({
  tipo_pessoa: 'PF',
  ...Object.fromEntries(CAMPOS_IDENTIFICACAO.map((campo) => [campo, ''])),
});

function textoValido(valor, campo) {
  return typeof valor === 'string' && valor.length <= LIMITES[campo];
}

// Só devolve dados com o formato exato; qualquer coisa estranha (versão antiga, JSON adulterado) vale como vazio.
function normalizar(guardado) {
  if (!guardado || typeof guardado !== 'object' || guardado.v !== VERSAO) return null;
  const { dados } = guardado;
  if (!dados || typeof dados !== 'object' || !TIPOS_PESSOA.includes(dados.tipo_pessoa)) return null;
  const resultado = { ...IDENTIFICACAO_VAZIA, tipo_pessoa: dados.tipo_pessoa };
  for (const campo of CAMPOS_IDENTIFICACAO) {
    const valor = dados[campo] ?? '';
    if (!textoValido(valor, campo)) return null;
    resultado[campo] = valor;
  }
  if (resultado.uf !== '' && !UFS.includes(resultado.uf)) return null;
  if (resultado.tipo_pessoa === 'PF') {
    resultado.razao_social = '';
    resultado.cnpj = '';
  }
  return resultado;
}

// "Lembrar meus dados neste aparelho": os dados ficam só no navegador, nunca no servidor.
export const dadosClienteService = {
  // -> dados salvos ou null (ausente, corrompido ou de outra versão: nesse caso a chave é apagada)
  ler() {
    // Ausente e JSON inválido chegam iguais (null): apagar a chave é inofensivo nos dois casos.
    const dados = normalizar(storage.ler(CHAVE_DADOS_CLIENTE, null));
    if (!dados) storage.remover(CHAVE_DADOS_CLIENTE);
    return dados;
  },

  salvar(dados) {
    const normalizados = normalizar({ v: VERSAO, dados });
    if (!normalizados) return false;
    return storage.gravar(CHAVE_DADOS_CLIENTE, { v: VERSAO, dados: normalizados });
  },

  esquecer() {
    storage.remover(CHAVE_DADOS_CLIENTE);
  },

  // Chamada na inicialização da loja.
  limparLegado() {
    CHAVES_LEGADAS.forEach((chave) => storage.remover(chave));
  },
};
