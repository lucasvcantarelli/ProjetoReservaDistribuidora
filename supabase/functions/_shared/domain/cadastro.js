// Validadores de campos de cliente (tabela `clientes`, pedido e senha do admin).
// Módulo puro: sem imports de Deno/npm, reaproveitado pelo front-end.
import { somenteDigitos } from './documento.js';

export const TIPOS_PESSOA = ['PF', 'PJ'];
export const UFS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
];

export const TAMANHO_MINIMO_SENHA = 8;
export const TAMANHO_MAXIMO_SENHA = 72; // limite do bcrypt usado pelo Supabase Auth
export const TAMANHO_CEP = 8;
export const TAMANHOS_TELEFONE = [10, 11];
export const TAMANHO_MAXIMO = {
  nome: 120,
  razao_social: 160,
  nome_fantasia: 160,
  email: 254,
  rua: 160,
  numero: 20,
  complemento: 80,
  bairro: 80,
  cidade: 80,
};

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MSG_OBRIGATORIO = {
  nome: 'Informe o nome.',
  razao_social: 'Informe a razão social.',
  nome_fantasia: 'Informe o nome fantasia.',
  rua: 'Informe a rua.',
  numero: 'Informe o número.',
  bairro: 'Informe o bairro.',
  cidade: 'Informe a cidade.',
};
const MSG_LONGO = (campo) => `Use no máximo ${TAMANHO_MAXIMO[campo]} caracteres.`;

export const CAMPOS_TEXTO_LIVRE = ['nome', 'rua', 'numero', 'bairro', 'cidade'];

function textoAparado(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

/**
 * Texto de linha única: quebras de linha, tabs e demais espaços em branco viram um espaço só.
 * Impede que um campo digitado forje linhas na mensagem do WhatsApp.
 * @param {unknown} valor
 * @returns {string}
 */
export function textoUmaLinha(valor) {
  return typeof valor === 'string' ? valor.replace(/\s+/g, ' ').trim() : '';
}

// Cada validador devolve { valor } quando válido ou { erro } quando inválido.
export function validarTextoLivre(campo, { obrigatorio }) {
  return (bruto) => {
    const texto = textoUmaLinha(bruto);
    if (!texto) return obrigatorio ? { erro: MSG_OBRIGATORIO[campo] } : { valor: '' };
    if (texto.length > TAMANHO_MAXIMO[campo]) return { erro: MSG_LONGO(campo) };
    return { valor: texto };
  };
}

export function validarTelefone(bruto) {
  const digitos = somenteDigitos(bruto);
  if (!TAMANHOS_TELEFONE.includes(digitos.length)) {
    return { erro: 'Informe um telefone com DDD (10 ou 11 dígitos).' };
  }
  return { valor: digitos };
}

export function validarEmail(bruto) {
  const email = textoAparado(bruto).toLowerCase();
  if (!REGEX_EMAIL.test(email) || email.length > TAMANHO_MAXIMO.email) {
    return { erro: 'Informe um e-mail válido.' };
  }
  return { valor: email };
}

// Usada na definição de nova senha do admin (recuperação de senha).
export function validarSenha(bruto) {
  const senha = typeof bruto === 'string' ? bruto : '';
  if (senha.length < TAMANHO_MINIMO_SENHA) {
    return { erro: `A senha deve ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.` };
  }
  if (senha.length > TAMANHO_MAXIMO_SENHA) {
    return { erro: `A senha deve ter no máximo ${TAMANHO_MAXIMO_SENHA} caracteres.` };
  }
  return { valor: senha };
}

export function validarCep(bruto) {
  const digitos = somenteDigitos(bruto);
  if (digitos.length !== TAMANHO_CEP) return { erro: 'Informe um CEP válido (8 dígitos).' };
  return { valor: digitos };
}

export function validarUf(bruto) {
  const uf = textoAparado(bruto).toUpperCase();
  if (!UFS.includes(uf)) return { erro: 'Informe uma UF válida.' };
  return { valor: uf };
}

export function validarTipoPessoa(bruto) {
  const tipo = textoAparado(bruto).toUpperCase();
  if (!TIPOS_PESSOA.includes(tipo)) return { erro: 'Escolha pessoa física ou jurídica.' };
  return { valor: tipo };
}
