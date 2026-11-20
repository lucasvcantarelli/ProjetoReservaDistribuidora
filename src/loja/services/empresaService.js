import { apiLoja } from './apiLoja.js';

export const empresaService = {
  // -> { nome, logo_url, whatsapp, endereco }
  obter() {
    return apiLoja.chamar('config-publica', {});
  },
};
