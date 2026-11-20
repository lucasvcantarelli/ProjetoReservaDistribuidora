// Validação e normalização das configurações da empresa (tabela `config_empresa`).
// Módulo puro: sem imports de Deno/npm.
import { validarEmail } from './cadastro.js';
import { cnpjValido, somenteDigitos } from './documento.js';

export const TAMANHO_MAXIMO_CONFIG = {
  nome: 120,
  endereco: 300,
  rodape_mensagem: 500,
};
export const DDI_BRASIL = '55';
export const TAMANHOS_WHATSAPP_SEM_DDI = [10, 11];
export const TAMANHOS_WHATSAPP_COM_DDI = [12, 13];

const MSG_NOME = 'Informe o nome da empresa.';
const MSG_CNPJ = 'Informe um CNPJ válido.';
const MSG_WHATSAPP = 'Informe um WhatsApp com DDD (ex.: (81) 99999-0000).';
const msgLongo = (campo) => `Use no máximo ${TAMANHO_MAXIMO_CONFIG[campo]} caracteres.`;

const texto = (bruto) => (typeof bruto === 'string' ? bruto.trim() : '');

function validarTexto(campo, { obrigatorio }) {
  return (bruto) => {
    const limpo = texto(bruto);
    if (!limpo) return obrigatorio ? { erro: MSG_NOME } : { valor: '' };
    if (limpo.length > TAMANHO_MAXIMO_CONFIG[campo]) return { erro: msgLongo(campo) };
    return { valor: limpo };
  };
}

// Vazio limpa o campo (null); preenchido precisa ser um CNPJ válido, guardado só com dígitos.
function validarCnpjOpcional(bruto) {
  const digitos = somenteDigitos(bruto);
  if (!texto(bruto)) return { valor: null };
  return cnpjValido(digitos) ? { valor: digitos } : { erro: MSG_CNPJ };
}

// Vazio limpa o campo (null); preenchido precisa ser um e-mail válido (minúsculas).
function validarEmailOpcional(bruto) {
  return texto(bruto) ? validarEmail(bruto) : { valor: null };
}

// Vazio limpa o campo (null); 10–11 dígitos ganham o 55; 12–13 precisam começar com 55.
function validarWhatsapp(bruto) {
  const digitos = somenteDigitos(bruto);
  if (!texto(bruto)) return { valor: null };
  const comDdi = TAMANHOS_WHATSAPP_SEM_DDI.includes(digitos.length)
    ? DDI_BRASIL + digitos
    : digitos;
  const valido = TAMANHOS_WHATSAPP_COM_DDI.includes(comDdi.length) && comDdi.startsWith(DDI_BRASIL);
  return valido ? { valor: comDdi } : { erro: MSG_WHATSAPP };
}

const VALIDADORES = {
  nome: validarTexto('nome', { obrigatorio: true }),
  cnpj: validarCnpjOpcional,
  whatsapp: validarWhatsapp,
  endereco: validarTexto('endereco', { obrigatorio: false }),
  rodape_mensagem: validarTexto('rodape_mensagem', { obrigatorio: false }),
  email_privacidade: validarEmailOpcional,
};

/**
 * Valida os campos de configuração presentes em `dados` (os ausentes ficam como estão).
 * @param {object} dados nome, cnpj, whatsapp, endereco, rodape_mensagem, email_privacidade.
 * @returns {{ ok: true, valor: object } | { ok: false, campos: Record<string, string> }}
 */
export function validarConfig(dados) {
  const entrada = dados !== null && typeof dados === 'object' ? dados : {};
  const valor = {};
  const campos = {};
  for (const [campo, validar] of Object.entries(VALIDADORES)) {
    if (entrada[campo] === undefined) continue;
    const r = validar(entrada[campo]);
    if (r.erro) campos[campo] = r.erro;
    else valor[campo] = r.valor;
  }
  return Object.keys(campos).length > 0 ? { ok: false, campos } : { ok: true, valor };
}
