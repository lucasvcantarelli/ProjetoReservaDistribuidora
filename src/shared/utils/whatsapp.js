// WhatsApp da empresa (painel e loja): normalização e texto de conferência (mesma regra do servidor).
import {
  DDI_BRASIL,
  TAMANHOS_WHATSAPP_COM_DDI,
  TAMANHOS_WHATSAPP_SEM_DDI,
} from '../../../supabase/functions/_shared/domain/configEmpresa.js';
import { formatarTelefone, somenteDigitos } from './formatar.js';

const URL_WHATSAPP = 'https://wa.me/';

// 10–11 dígitos ganham o 55; 12–13 precisam começar com 55; senão (vazio/incompleto) -> null.
export function whatsappCompleto(texto) {
  const digitos = somenteDigitos(texto);
  const comDdi = TAMANHOS_WHATSAPP_SEM_DDI.includes(digitos.length)
    ? DDI_BRASIL + digitos
    : digitos;
  const valido = TAMANHOS_WHATSAPP_COM_DDI.includes(comDdi.length) && comDdi.startsWith(DDI_BRASIL);
  return valido ? comDdi : null;
}

// 5581999990000 -> '+55 (81) 99999-0000'; número incompleto -> null.
export function formatarWhatsappCompleto(texto) {
  const completo = whatsappCompleto(texto);
  if (!completo) return null;
  return `+${DDI_BRASIL} ${formatarTelefone(completo.slice(DDI_BRASIL.length))}`;
}

export function linkDeTeste(texto) {
  const completo = whatsappCompleto(texto);
  return completo ? `${URL_WHATSAPP}${completo}` : null;
}

// Valor vindo do servidor (com DDI) para o campo do formulário (só DDD + número, com máscara).
export function whatsappParaCampo(valor) {
  return formatarTelefone(valor, { colado: true });
}
