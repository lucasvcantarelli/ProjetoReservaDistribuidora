// Formatadores do front. Reais e documentos vêm do domínio compartilhado com as Edge Functions.
import { somenteDigitos } from '../../../supabase/functions/_shared/domain/documento.js';

export {
  formatarReais,
  formatarInteiro,
} from '../../../supabase/functions/_shared/domain/dinheiro.js';
export {
  somenteDigitos,
  formatarCpf,
  formatarCnpj,
  formatarDocumento,
  cpfValido,
  cnpjValido,
} from '../../../supabase/functions/_shared/domain/documento.js';

const CENTAVOS_POR_REAL = 100;
const FORMATO_REAIS = /^\d+(,\d{1,2})?$|^\d{1,3}(\.\d{3})+(,\d{1,2})?$/;
const TAMANHO_TELEFONE_FIXO = 10;
const TAMANHO_TELEFONE_MAXIMO = 11;
const TAMANHO_CEP = 8;

// '1.234,56' | 'R$ 10,5' | '10' -> centavos inteiros; qualquer outra coisa -> null.
export function reaisParaCentavos(texto) {
  const limpo = String(texto ?? '')
    .replace(/R\$/gi, '')
    .replace(/\s/g, '');
  if (!FORMATO_REAIS.test(limpo)) return null;
  const [inteiros, centavos = ''] = limpo.replace(/\./g, '').split(',');
  return Number(inteiros) * CENTAVOS_POR_REAL + Number(centavos.padEnd(2, '0'));
}

const DDI_BRASIL = '55';

// (11) 91234-5678 ou (11) 2345-6789; aceita digitação parcial.
// Só quando o valor veio de uma colagem (`colado`), um número com DDI (+55 11 98765-4321) perde o 55 do
// início; digitando, o 12º dígito é ignorado (senão um DDD 55 seria reembaralhado a cada tecla).
export function formatarTelefone(valor, { colado = false } = {}) {
  let digitos = somenteDigitos(valor);
  if (colado && digitos.length > TAMANHO_TELEFONE_MAXIMO && digitos.startsWith(DDI_BRASIL)) {
    digitos = digitos.slice(DDI_BRASIL.length);
  }
  const d = digitos.slice(0, TAMANHO_TELEFONE_MAXIMO);
  if (d.length <= 2) return d;
  const corte = d.length > TAMANHO_TELEFONE_FIXO ? 7 : 6;
  const miolo = d.slice(2, corte);
  const fim = d.slice(corte);
  return `(${d.slice(0, 2)}) ${miolo}${fim ? `-${fim}` : ''}`;
}

export function formatarCep(valor) {
  const d = somenteDigitos(valor).slice(0, TAMANHO_CEP);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

const TAMANHO_CPF = 11;
const TAMANHO_CNPJ = 14;
const CPF = { tamanho: TAMANHO_CPF, cortes: [3, 6, 9], separadores: ['.', '.', '-'] };
const CNPJ = { tamanho: TAMANHO_CNPJ, cortes: [2, 5, 8, 12], separadores: ['.', '.', '/', '-'] };

// Máscara progressiva (durante a digitação) de CPF (PF) ou CNPJ (PJ).
export function mascararDocumento(valor, tipoPessoa) {
  const { tamanho, cortes, separadores } = tipoPessoa === 'PJ' ? CNPJ : CPF;
  const digitos = somenteDigitos(valor).slice(0, tamanho);
  let saida = '';
  let inicio = 0;
  cortes.forEach((corte, i) => {
    if (digitos.length <= corte) return;
    saida += digitos.slice(inicio, corte) + separadores[i];
    inicio = corte;
  });
  return saida + digitos.slice(inicio);
}
