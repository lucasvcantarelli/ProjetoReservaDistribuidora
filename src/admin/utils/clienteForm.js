// Ficha de cliente (cadastro interno do admin): conversões e validação (regras do domínio compartilhado).
import {
  MAX_OBSERVACOES,
  validarClienteAdmin,
} from '../../../supabase/functions/_shared/domain/clienteAdmin.js';
import { formatarCep, formatarTelefone, mascararDocumento } from '../../shared/utils/formatar.js';

export { MAX_OBSERVACOES };

const TIPO_PADRAO = 'PJ';
const CAMPOS_TEXTO = [
  'razao_social',
  'nome_fantasia',
  'nome',
  'email',
  'rua',
  'numero',
  'complemento',
  'bairro',
  'cidade',
  'uf',
  'observacoes',
];

// `cliente`: resposta de `obter`; sem ele, os valores de uma ficha nova (empresa, tudo vazio).
export function clienteParaFormulario(cliente) {
  const tipo = cliente?.tipo_pessoa ?? TIPO_PADRAO;
  return {
    tipo_pessoa: tipo,
    cpf_cnpj: mascararDocumento(cliente?.cpf_cnpj, tipo),
    telefone: formatarTelefone(cliente?.telefone),
    cep: formatarCep(cliente?.cep),
    ...Object.fromEntries(CAMPOS_TEXTO.map((campo) => [campo, cliente?.[campo] ?? ''])),
  };
}

export const instantaneoCliente = (valores) => JSON.stringify(valores);

// Valida com as mesmas regras do servidor. -> { ok: true, dados } | { ok: false, campos }
// `dados` já normalizados (documento e telefone em dígitos, vazios como null).
export function validarClienteForm(valores) {
  const resultado = validarClienteAdmin(valores);
  return resultado.ok ? { ok: true, dados: resultado.valor } : resultado;
}
