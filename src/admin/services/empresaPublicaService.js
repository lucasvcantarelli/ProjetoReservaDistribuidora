import { criarApi } from '../../shared/services/api.js';

// A política de privacidade do painel é pública (abre sem login): lê a mesma configuração pública da loja.
const apiPublica = criarApi();

export const empresaPublicaService = {
  // -> { nome, cnpj, whatsapp, endereco, email_privacidade, ... }
  obter() {
    return apiPublica.chamar('config-publica', {});
  },
};
