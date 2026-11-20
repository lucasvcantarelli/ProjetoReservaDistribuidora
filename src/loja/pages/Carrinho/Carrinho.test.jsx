import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderizarLoja } from '../../../test/renderizarLoja.jsx';
import { pedidoService } from '../../services/pedidoService.js';
import { catalogoService } from '../../services/catalogoService.js';
import { CHAVE_CARRINHO } from '../../services/carrinhoService.js';

const ITEM = {
  chave: 'v1:fardo',
  variacao_id: 'v1',
  forma: 'fardo',
  quantidade: 2,
  produto_id: 'p1',
  produto_nome: 'Copo descartável',
  nome_tamanho: 'M',
  qtd_por_fardo: 1000,
  preco_centavos: 120000,
  foto_url: 'http://x/a.webp',
};

function guardarCarrinho(itens) {
  window.localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(itens));
}

function mockarCatalogoVazio() {
  vi.spyOn(catalogoService, 'categorias').mockResolvedValue([]);
  vi.spyOn(catalogoService, 'produtos').mockResolvedValue({ itens: [], total: 0 });
}

describe('Carrinho', () => {
  it('carrinho vazio mostra estado vazio com ação para ver produtos', async () => {
    mockarCatalogoVazio();
    const roteador = renderizarLoja('/carrinho');
    expect(await screen.findByText('Seu carrinho está vazio.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ver produtos' }));
    expect(roteador.state.location.pathname).toBe('/');
  });

  it('lista item com forma, preço, subtotal, total e aviso de preços', async () => {
    guardarCarrinho([ITEM]);
    renderizarLoja('/carrinho');
    expect(await screen.findByText('M · Fardo com 1.000 un.')).toBeInTheDocument();
    expect(screen.getByText('R$ 1.200,00 cada')).toBeInTheDocument();
    expect(screen.getAllByText('R$ 2.400,00')).toHaveLength(2);
    expect(
      screen.getByText('Os preços são confirmados ao finalizar o pedido.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('selo-carrinho')).toHaveTextContent('1');
  });

  it('alterar a quantidade recalcula o subtotal e grava no armazenamento', async () => {
    guardarCarrinho([ITEM]);
    renderizarLoja('/carrinho');
    await userEvent.click(await screen.findByRole('button', { name: /aumentar quantidade/i }));
    expect(screen.getAllByText('R$ 3.600,00')).toHaveLength(2);
    expect(JSON.parse(window.localStorage.getItem(CHAVE_CARRINHO))[0].quantidade).toBe(3);
  });

  it('remover pede confirmação; confirmar esvazia o carrinho', async () => {
    guardarCarrinho([ITEM]);
    renderizarLoja('/carrinho');
    await userEvent.click(await screen.findByRole('button', { name: /remover copo/i }));
    const dialogo = await screen.findByRole('dialog', { name: 'Remover do carrinho?' });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Remover' }));
    expect(await screen.findByText('Seu carrinho está vazio.')).toBeInTheDocument();
  });

  it('cancelar a confirmação mantém o item', async () => {
    guardarCarrinho([ITEM]);
    renderizarLoja('/carrinho');
    await userEvent.click(await screen.findByRole('button', { name: /remover copo/i }));
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('M · Fardo com 1.000 un.')).toBeInTheDocument();
  });

  it('"Finalizar pedido" leva a /finalizar e "Continuar comprando" ao início', async () => {
    guardarCarrinho([ITEM]);
    mockarCatalogoVazio();
    vi.spyOn(pedidoService, 'revisar').mockReturnValue(new Promise(() => {}));
    const roteador = renderizarLoja('/carrinho');
    await userEvent.click(await screen.findByRole('button', { name: 'Continuar comprando' }));
    expect(roteador.state.location.pathname).toBe('/');
    await act(() => roteador.navigate('/carrinho'));
    await userEvent.click(await screen.findByRole('button', { name: 'Finalizar pedido' }));
    expect(roteador.state.location.pathname).toBe('/finalizar');
  });

  it('item inválido no armazenamento é ignorado sem quebrar a página', async () => {
    guardarCarrinho([{ lixo: 1 }, ITEM]);
    renderizarLoja('/carrinho');
    expect(await screen.findByText('M · Fardo com 1.000 un.')).toBeInTheDocument();
  });

  it('sincroniza com outra aba pelo evento storage', async () => {
    mockarCatalogoVazio();
    renderizarLoja('/carrinho');
    await screen.findByText('Seu carrinho está vazio.');
    guardarCarrinho([ITEM]);
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: CHAVE_CARRINHO }));
    });
    expect(await screen.findByText('M · Fardo com 1.000 un.')).toBeInTheDocument();
  });
});
