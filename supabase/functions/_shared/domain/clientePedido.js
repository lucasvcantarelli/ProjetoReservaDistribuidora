// Validação dos dados de identificação digitados no pedido (sem conta de cliente).
// Esses dados só vão para a mensagem do WhatsApp; nada é salvo. PF nunca informa CPF.
// Módulo puro: sem imports de Deno/npm, reaproveitado pelo front-end.
import {
  CAMPOS_TEXTO_LIVRE,
  validarCep,
  validarTelefone,
  validarTextoLivre,
  validarTipoPessoa,
  validarUf,
} from './cadastro.js';
import { cnpjValido, somenteDigitos } from './documento.js';

const MSG_CNPJ = 'Informe um CNPJ válido.';

const validarComplemento = validarTextoLivre('complemento', { obrigatorio: false });
const validarRazaoSocial = validarTextoLivre('razao_social', { obrigatorio: true });

const VALIDADORES = {
  telefone: validarTelefone,
  cep: validarCep,
  uf: validarUf,
  complemento: validarComplemento,
  ...Object.fromEntries(
    CAMPOS_TEXTO_LIVRE.map((campo) => [campo, validarTextoLivre(campo, { obrigatorio: true })]),
  ),
};

function aplicar(resultado, campo, saida, erros) {
  if (resultado.erro) erros[campo] = resultado.erro;
  else saida[campo] = resultado.valor;
}

function validarCnpj(dados) {
  const digitos = somenteDigitos(dados.cnpj ?? dados.cpf_cnpj);
  return cnpjValido(digitos) ? { valor: digitos } : { erro: MSG_CNPJ };
}

/**
 * Valida e normaliza a identificação do cliente no pedido.
 * - Obrigatórios: tipo, nome, telefone (10–11 dígitos), CEP, rua, número, bairro, cidade e UF.
 * - PJ: razão social e CNPJ válido (em `cnpj` ou `cpf_cnpj`; o erro vem em `campos.cpf_cnpj`).
 * - PF: qualquer CPF enviado é descartado; razão social e e-mail também não passam.
 * - Campos de linha única têm quebras de linha removidas e espaços colapsados.
 *
 * @param {object} dados
 * @returns {{ ok: true, valor: object } | { ok: false, campos: Record<string, string> }}
 */
export function validarClientePedido(dados) {
  const entrada = dados !== null && typeof dados === 'object' ? dados : {};
  const saida = {};
  const erros = {};

  aplicar(validarTipoPessoa(entrada.tipo_pessoa), 'tipo_pessoa', saida, erros);
  for (const [campo, validar] of Object.entries(VALIDADORES)) {
    aplicar(validar(entrada[campo]), campo, saida, erros);
  }
  if (saida.tipo_pessoa === 'PJ') {
    aplicar(validarRazaoSocial(entrada.razao_social), 'razao_social', saida, erros);
    aplicar(validarCnpj(entrada), 'cpf_cnpj', saida, erros);
  }

  return Object.keys(erros).length > 0 ? { ok: false, campos: erros } : { ok: true, valor: saida };
}
