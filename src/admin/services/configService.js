import { apiAdmin } from './apiAdmin.js';

const FUNCAO = 'admin-config';
const NOME_ARQUIVO = 'logo';

// Configurações da empresa. `whatsapp` vem só com dígitos e DDI (ex.: 5581999990000).
// Resposta: { nome, cnpj, whatsapp, endereco, rodape_mensagem, email_privacidade, logo_url }.
export const configService = {
  obter() {
    return apiAdmin.chamar(FUNCAO, { acao: 'obter' }, { autenticado: true });
  },

  // `dados`: nome, cnpj, whatsapp, endereco, rodape_mensagem, email_privacidade -> configuração atualizada
  editar(dados) {
    return apiAdmin.chamar(FUNCAO, { acao: 'editar', ...dados }, { autenticado: true });
  },

  // `arquivo`: Blob já comprimido (multipart: campo `arquivo`) -> configuração atualizada
  enviarLogo(arquivo) {
    const formData = new FormData();
    formData.append('acao', 'enviar_logo');
    formData.append('arquivo', arquivo, NOME_ARQUIVO);
    return apiAdmin.chamar(FUNCAO, undefined, { autenticado: true, formData });
  },
};
