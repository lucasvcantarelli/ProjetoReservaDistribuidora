// Formulário de configurações da empresa: conversões e validação (regras do domínio compartilhado).
import {
  TAMANHO_MAXIMO_CONFIG,
  validarConfig,
} from '../../../supabase/functions/_shared/domain/configEmpresa.js';
import { mascararDocumento } from '../../shared/utils/formatar.js';
import { whatsappParaCampo } from '../../shared/utils/whatsapp.js';

export const MAX_RODAPE = TAMANHO_MAXIMO_CONFIG.rodape_mensagem;
export const MAX_NOME_EMPRESA = TAMANHO_MAXIMO_CONFIG.nome;
export const MAX_ENDERECO = TAMANHO_MAXIMO_CONFIG.endereco;
export const LADO_MAXIMO_LOGO = 600;

const TIPO_PESSOA_JURIDICA = 'PJ';

export function configParaFormulario(config) {
  return {
    nome: config.nome ?? '',
    cnpj: mascararDocumento(config.cnpj, TIPO_PESSOA_JURIDICA),
    whatsapp: whatsappParaCampo(config.whatsapp),
    endereco: config.endereco ?? '',
    email_privacidade: config.email_privacidade ?? '',
    rodape_mensagem: config.rodape_mensagem ?? '',
  };
}

export const instantaneoConfig = (valores) => JSON.stringify(valores);

// -> { ok: true, dados } | { ok: false, campos }; `dados` já normalizados (CNPJ em dígitos, WhatsApp
// com DDI 55, vazios como null) para enviar ao servidor.
export function validarConfigForm(valores) {
  const resultado = validarConfig(valores);
  return resultado.ok ? { ok: true, dados: resultado.valor } : resultado;
}
