import { storage } from './storage.js';

export const CHAVE_AVISO_PRIVACIDADE = 'reserva.aviso-privacidade';

// Guarda só que o aviso de privacidade já foi visto neste aparelho. Nunca lança: se o armazenamento
// estiver bloqueado, `marcarVisto` devolve false e quem chama esconde o aviso só nesta sessão.
export const avisoPrivacidadeService = {
  foiVisto() {
    return storage.ler(CHAVE_AVISO_PRIVACIDADE, false) === true;
  },

  // -> true se a preferência ficou guardada
  marcarVisto() {
    return storage.gravar(CHAVE_AVISO_PRIVACIDADE, true);
  },
};
