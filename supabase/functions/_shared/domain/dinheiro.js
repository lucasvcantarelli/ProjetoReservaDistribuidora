// Formatação de valores em reais. Determinística: não depende de Intl/ICU do runtime.
// Módulo puro: sem imports de Deno/npm, reaproveitado pelo front-end.

const CENTAVOS_POR_REAL = 100;

/**
 * Formata um inteiro com separador de milhar pt-BR.
 * @param {number} valor Inteiro não negativo.
 * @returns {string} Texto com pontos a cada 3 dígitos (ex.: "1.234.567").
 */
export function formatarInteiro(valor) {
  return String(Math.trunc(Number(valor) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Formata centavos como reais.
 * @param {number} centavos Valor inteiro em centavos (inválido vira 0).
 * @returns {string} Ex.: "R$ 1.234,56"; negativos como "-R$ 1,50".
 */
export function formatarReais(centavos) {
  const valor = Number.isFinite(centavos) ? Math.trunc(centavos) : 0;
  const absoluto = Math.abs(valor);
  const reais = Math.floor(absoluto / CENTAVOS_POR_REAL);
  const resto = String(absoluto % CENTAVOS_POR_REAL).padStart(2, '0');
  const sinal = valor < 0 ? '-' : '';
  return `${sinal}R$ ${formatarInteiro(reais)},${resto}`;
}
