import { apiLoja } from './apiLoja.js';
import { carrinhoService } from './carrinhoService.js';

function corpoDoPedido(itens) {
  return {
    itens: itens.map(({ variacao_id, forma, quantidade }) => ({ variacao_id, forma, quantidade })),
    precos_vistos: carrinhoService.precosVistos(),
  };
}

export const CHAVE_CONFIRMACAO = 'reserva.confirmacaoPedido';

function sessionStorageSeguro(acao) {
  try {
    return acao(window.sessionStorage);
  } catch {
    return undefined; // modo privado ou cota: sem o lembrete, o cliente ainda limpa o carrinho à mão
  }
}

// O pedido não é salvo e não exige conta: o servidor só confere os preços e monta o link do WhatsApp.
export const pedidoService = {
  // -> { itens, divergencias, total_centavos }
  revisar(itens) {
    return apiLoja.chamar('pedido-revisar', corpoDoPedido(itens));
  },

  // Lembra, na aba, que o cliente foi ao WhatsApp e ainda precisa confirmar o envio.
  marcarConfirmacaoPendente() {
    sessionStorageSeguro((s) => s.setItem(CHAVE_CONFIRMACAO, '1'));
  },

  confirmacaoPendente() {
    return sessionStorageSeguro((s) => s.getItem(CHAVE_CONFIRMACAO)) === '1';
  },

  limparConfirmacaoPendente() {
    sessionStorageSeguro((s) => s.removeItem(CHAVE_CONFIRMACAO));
  },

  // `cliente`: identificação digitada (vai só para a mensagem do WhatsApp).
  // -> { link }; em 409 a nova revisão vem em ErroApi.dados; em 400, os erros em ErroApi.campos
  enviar(itens, observacao, cliente) {
    return apiLoja.chamar('pedido-whatsapp', { ...corpoDoPedido(itens), observacao, cliente });
  },
};
