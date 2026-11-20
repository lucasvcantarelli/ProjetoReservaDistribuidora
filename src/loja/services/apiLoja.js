import { criarApi } from '../../shared/services/api.js';

// A loja é pública: não há sessão de cliente, então nenhuma chamada leva token.
export const apiLoja = criarApi();
