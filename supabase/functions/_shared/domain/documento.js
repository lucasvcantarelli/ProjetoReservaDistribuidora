// Validação de CPF e CNPJ (dígitos verificadores da Receita Federal).
// Módulo puro: sem imports de Deno/npm, reaproveitado pelo front-end.

const TAMANHO_CPF = 11;
const TAMANHO_CNPJ = 14;
const PESOS_CNPJ_BASE = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/**
 * Remove tudo que não for dígito.
 * @param {unknown} valor Texto (ou número) com ou sem máscara.
 * @returns {string} Apenas os dígitos; string vazia para null/undefined.
 */
export function somenteDigitos(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).replace(/\D/g, '');
}

function todosIguais(digitos) {
  return /^(\d)\1+$/.test(digitos);
}

function resto11(soma) {
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function digitoCpf(digitos, quantidade) {
  let soma = 0;
  for (let i = 0; i < quantidade; i += 1) {
    soma += Number(digitos[i]) * (quantidade + 1 - i);
  }
  return resto11(soma);
}

function digitoCnpj(digitos, quantidade) {
  // Os pesos do 1º dígito são os do 2º sem o primeiro elemento.
  const pesos = PESOS_CNPJ_BASE.slice(PESOS_CNPJ_BASE.length - quantidade);
  let soma = 0;
  for (let i = 0; i < quantidade; i += 1) {
    soma += Number(digitos[i]) * pesos[i];
  }
  return resto11(soma);
}

function temDigitosVerificadores(digitos, calcular, tamanho) {
  const base = tamanho - 2;
  return (
    calcular(digitos, base) === Number(digitos[base]) &&
    calcular(digitos, base + 1) === Number(digitos[base + 1])
  );
}

/**
 * Valida um CPF.
 * @param {unknown} valor CPF com ou sem máscara.
 * @returns {boolean} true se tem 11 dígitos, não é sequência repetida e os verificadores conferem.
 */
export function cpfValido(valor) {
  const digitos = somenteDigitos(valor);
  if (digitos.length !== TAMANHO_CPF || todosIguais(digitos)) return false;
  return temDigitosVerificadores(digitos, digitoCpf, TAMANHO_CPF);
}

/**
 * Valida um CNPJ.
 * @param {unknown} valor CNPJ com ou sem máscara.
 * @returns {boolean} true se tem 14 dígitos, não é sequência repetida e os verificadores conferem.
 */
export function cnpjValido(valor) {
  const digitos = somenteDigitos(valor);
  if (digitos.length !== TAMANHO_CNPJ || todosIguais(digitos)) return false;
  return temDigitosVerificadores(digitos, digitoCnpj, TAMANHO_CNPJ);
}

/**
 * Aplica a máscara de CNPJ.
 * @param {unknown} valor CNPJ (14 dígitos, com ou sem máscara).
 * @returns {string} Formato 12.345.678/0001-90; devolve só os dígitos se o tamanho não for 14.
 */
export function formatarCnpj(valor) {
  const digitos = somenteDigitos(valor);
  if (digitos.length !== TAMANHO_CNPJ) return digitos;
  return digitos.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

/**
 * Aplica a máscara de CPF.
 * @param {unknown} valor CPF (11 dígitos, com ou sem máscara).
 * @returns {string} Formato 000.000.000-00; devolve só os dígitos se o tamanho não for 11.
 */
export function formatarCpf(valor) {
  const digitos = somenteDigitos(valor);
  if (digitos.length !== TAMANHO_CPF) return digitos;
  return digitos.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

/**
 * Aplica a máscara de CPF ou CNPJ conforme o tipo de pessoa.
 * @param {unknown} valor Documento com ou sem máscara.
 * @param {'PF'|'PJ'} tipoPessoa
 * @returns {string}
 */
export function formatarDocumento(valor, tipoPessoa) {
  return tipoPessoa === 'PJ' ? formatarCnpj(valor) : formatarCpf(valor);
}

/**
 * Aplica a máscara de telefone brasileiro (10 ou 11 dígitos).
 * @param {unknown} valor Telefone com ou sem máscara.
 * @returns {string} (81) 99999-0000 ou (81) 9999-0000; outro tamanho volta aparado, como veio.
 */
export function formatarTelefone(valor) {
  const d = somenteDigitos(valor);
  if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  return String(valor ?? '').trim();
}
