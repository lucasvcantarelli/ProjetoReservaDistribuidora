import { servir } from '../_shared/infra/http.js';
import { revisarCarrinho } from '../_shared/infra/pedidoRepo.js';

// Pública: o visitante revisa o carrinho sem conta (só lê preços do catálogo).
servir(async (_req, corpo) => revisarCarrinho(corpo));
