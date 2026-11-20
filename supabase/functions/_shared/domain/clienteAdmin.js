// Regras do admin sobre clientes: tipo de busca da listagem, resumo/perfil e validação da ficha.
// Módulo puro: sem imports de Deno/npm.
import {
  textoUmaLinha,
  validarCep,
  validarEmail,
  validarTelefone,
  validarTextoLivre,
  validarTipoPessoa,
  validarUf,
} from './cadastro.js';
import {
  cnpjValido,
  cpfValido,
  formatarDocumento,
  formatarTelefone,
  somenteDigitos,
} from './documento.js';

export const MAX_BUSCA = 80;
export const MAX_RESULTADOS_BUSCA_TEXTO = 500;
export const MAX_OBSERVACOES = 1000;

const MSG_RAZAO_SOCIAL = 'Informe a razão social.';
const MSG_DOCUMENTO_PF = 'Informe um CPF válido para pessoa física.';
const MSG_DOCUMENTO_PJ = 'Informe um CNPJ válido para pessoa jurídica.';
const SO_NUMEROS_E_PONTUACAO = /^[\d\s.\-/()+]+$/;

/**
 * Interpreta o termo de busca: só números/pontuação → busca por documento (dígitos);
 * qualquer outra coisa → busca textual (nome, razão social, fantasia ou e-mail).
 * @param {string} termo Já aparado (veja `prepararBusca`).
 * @returns {{ tipo: 'documento', digitos: string } | { tipo: 'texto', termo: string } | null}
 */
export function interpretarBusca(termo) {
  if (!termo) return null;
  if (SO_NUMEROS_E_PONTUACAO.test(termo)) {
    const digitos = somenteDigitos(termo);
    return digitos ? { tipo: 'documento', digitos } : null;
  }
  return { tipo: 'texto', termo };
}

const porNomeEId = (a, b) =>
  a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }) || a.id.localeCompare(b.id);

/** Junta listas de clientes sem repetir `id` e ordena por nome. */
export function unirPorId(...listas) {
  const porId = new Map();
  for (const cliente of listas.flat()) porId.set(cliente.id, cliente);
  return [...porId.values()].sort(porNomeEId);
}

const documentoFormatado = (c) =>
  c.cpf_cnpj ? formatarDocumento(c.cpf_cnpj, c.tipo_pessoa) : null;

/** Linha da listagem do admin (documento e telefone formatados; ausentes ficam null). */
export function resumoCliente(c) {
  return {
    id: c.id,
    tipo_pessoa: c.tipo_pessoa,
    nome: c.nome,
    razao_social: c.razao_social ?? null,
    nome_fantasia: c.nome_fantasia ?? null,
    cpf_cnpj: documentoFormatado(c),
    telefone: c.telefone ? formatarTelefone(c.telefone) : null,
    email: c.email ?? null,
    cidade: c.cidade ?? null,
    uf: c.uf ?? null,
  };
}

/** Ficha completa (colunas já selecionadas) com o documento formatado. */
export function perfilCliente(c) {
  return { ...c, cpf_cnpj: documentoFormatado(c) };
}

const documentoCombina = (tipo, documento) =>
  tipo === 'PF' ? cpfValido(documento) : cnpjValido(documento);

// ---------------------------------------------------------------------------------------------
// Ficha do cliente (cadastro interno manual do admin; sem conta, sem Auth).
// ---------------------------------------------------------------------------------------------

const MSG_OBSERVACOES = `Use no máximo ${MAX_OBSERVACOES} caracteres.`;
const MSG_DOCUMENTO_QUALQUER = 'Informe um CPF ou CNPJ válido.';

const vazio = (bruto) => typeof bruto !== 'string' || bruto.trim() === '';

// Campo opcional: vazio vira null; preenchido passa pelo validador.
const opcional = (validar) => (bruto) => (vazio(bruto) ? { valor: null } : validar(bruto));

const textoOpcional = (campo) => opcional(validarTextoLivre(campo, { obrigatorio: false }));

const VALIDADORES_FICHA = {
  nome: validarTextoLivre('nome', { obrigatorio: true }),
  nome_fantasia: textoOpcional('nome_fantasia'),
  email: opcional(validarEmail),
  telefone: opcional(validarTelefone),
  cep: opcional(validarCep),
  rua: textoOpcional('rua'),
  numero: textoOpcional('numero'),
  complemento: textoOpcional('complemento'),
  bairro: textoOpcional('bairro'),
  cidade: textoOpcional('cidade'),
  uf: opcional(validarUf),
};

function validarObservacoes(bruto) {
  const texto = typeof bruto === 'string' ? bruto.trim() : '';
  return texto.length > MAX_OBSERVACOES ? { erro: MSG_OBSERVACOES } : { valor: texto };
}

// Documento opcional: vazio vira null (nunca string vazia, para não colidir no unique).
// Preenchido: CPF para PF, CNPJ para PJ; com tipo desconhecido (edição parcial), qualquer um.
function validarDocumentoFicha(bruto, tipo) {
  const digitos = somenteDigitos(bruto);
  if (!digitos) return { valor: null };
  if (tipo === 'PF') return cpfValido(digitos) ? { valor: digitos } : { erro: MSG_DOCUMENTO_PF };
  if (tipo === 'PJ') return cnpjValido(digitos) ? { valor: digitos } : { erro: MSG_DOCUMENTO_PJ };
  return cpfValido(digitos) || cnpjValido(digitos)
    ? { valor: digitos }
    : { erro: MSG_DOCUMENTO_QUALQUER };
}

function validarRazaoSocialFicha(dados, saida, erros, parcial) {
  const tipo = saida.tipo_pessoa;
  if (tipo === 'PF') {
    saida.razao_social = null; // PF nunca guarda razão social nem nome fantasia
    saida.nome_fantasia = null;
    return;
  }
  if (parcial && dados.razao_social === undefined) return;
  if (!textoUmaLinha(dados.razao_social)) {
    // Em edição parcial sem tipo, não dá para saber se a razão social é exigida.
    if (tipo === 'PJ') erros.razao_social = MSG_RAZAO_SOCIAL;
    else saida.razao_social = null;
    return;
  }
  const resultado = validarTextoLivre('razao_social', { obrigatorio: true })(dados.razao_social);
  if (resultado.erro) erros.razao_social = resultado.erro;
  else saida.razao_social = resultado.valor;
}

/**
 * Valida e normaliza a ficha de cliente cadastrada pelo admin.
 * - Obrigatórios: tipo e nome; PJ exige razão social (PF descarta).
 * - Opcionais (vazio vira null): nome fantasia, CPF/CNPJ, e-mail, telefone e endereço.
 *   Quando preenchidos são validados; o documento precisa casar com o tipo (CPF = PF, CNPJ = PJ).
 * - Observações: até MAX_OBSERVACOES caracteres (vazio vira '').
 * @param {object} dados
 * @param {{ parcial?: boolean }} [opcoes] `parcial`: edição; valida só os campos presentes.
 *   Sem `tipo_pessoa` no envio, o documento aceita CPF ou CNPJ e a razão social não é cruzada
 *   com o valor guardado.
 * @returns {{ ok: true, valor: object } | { ok: false, campos: Record<string, string> }}
 */
export function validarClienteAdmin(dados, { parcial = false } = {}) {
  const entrada = dados !== null && typeof dados === 'object' ? dados : {};
  const saida = {};
  const erros = {};
  const aplicar = (resultado, campo) => {
    if (resultado.erro) erros[campo] = resultado.erro;
    else saida[campo] = resultado.valor;
  };
  const enviado = (campo) => !parcial || entrada[campo] !== undefined;

  if (enviado('tipo_pessoa')) aplicar(validarTipoPessoa(entrada.tipo_pessoa), 'tipo_pessoa');
  for (const [campo, validar] of Object.entries(VALIDADORES_FICHA)) {
    if (enviado(campo)) aplicar(validar(entrada[campo]), campo);
  }
  if (enviado('cpf_cnpj')) {
    aplicar(validarDocumentoFicha(entrada.cpf_cnpj, saida.tipo_pessoa), 'cpf_cnpj');
  }
  if (enviado('observacoes')) aplicar(validarObservacoes(entrada.observacoes), 'observacoes');
  if (enviado('tipo_pessoa') || entrada.razao_social !== undefined) {
    validarRazaoSocialFicha(entrada, saida, erros, parcial);
  }

  return Object.keys(erros).length > 0 ? { ok: false, campos: erros } : { ok: true, valor: saida };
}

/**
 * Valida a edição parcial de uma ficha cruzando com o que está guardado: o documento precisa
 * casar com o tipo efetivo (CPF = PF, CNPJ = PJ), PJ nunca fica sem razão social e a troca
 * para PF limpa razão social e nome fantasia.
 * @param {object} dados Campos enviados.
 * @param {{ tipo_pessoa: string, cpf_cnpj: string|null, razao_social: string|null }} atual
 * @returns {{ ok: true, valor: object } | { ok: false, campos: Record<string, string> }}
 */
export function validarEdicaoFicha(dados, atual) {
  const resultado = validarClienteAdmin(dados, { parcial: true });
  if (!resultado.ok) return resultado;
  const valor = { ...resultado.valor };
  const campos = {};
  const tipo = valor.tipo_pessoa ?? atual.tipo_pessoa;
  const documento = 'cpf_cnpj' in valor ? valor.cpf_cnpj : atual.cpf_cnpj;
  const razaoSocial = 'razao_social' in valor ? valor.razao_social : atual.razao_social;

  if (documento && !documentoCombina(tipo, documento)) {
    campos.cpf_cnpj = tipo === 'PF' ? MSG_DOCUMENTO_PF : MSG_DOCUMENTO_PJ;
  }
  if (tipo === 'PJ' && !String(razaoSocial ?? '').trim()) campos.razao_social = MSG_RAZAO_SOCIAL;
  if (tipo === 'PF' && ('tipo_pessoa' in valor || 'razao_social' in valor)) {
    valor.razao_social = null;
    if ('tipo_pessoa' in valor) valor.nome_fantasia = null;
  }
  return Object.keys(campos).length > 0 ? { ok: false, campos } : { ok: true, valor };
}
