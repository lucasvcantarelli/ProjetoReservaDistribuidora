import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PRODUTO_TESTE, renderizarLoja } from '../../../test/renderizarLoja.jsx';
import { catalogoService } from '../../services/catalogoService.js';

async function abrirProduto(produto = PRODUTO_TESTE) {
  vi.spyOn(catalogoService, 'produto').mockResolvedValue(produto);
  const roteador = renderizarLoja(`/produto/${produto.id}`);
  await screen.findByRole('heading', { name: produto.nome });
  return roteador;
}

describe('Página do produto', () => {
  it('escolher M e Fardo mostra "Fardo com 1.000 un." e o preço do fardo', async () => {
    await abrirProduto();
    await userEvent.click(screen.getByRole('radio', { name: 'M' }));
    expect(screen.getByText('R$ 1,50')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Fardo com 1.000 un.' }));
    expect(screen.getByText('R$ 1.200,00')).toBeInTheDocument();
    expect(screen.getByText('por fardo')).toBeInTheDocument();
  });

  it('variação só-unidade não oferece Fardo', async () => {
    await abrirProduto();
    await userEvent.click(screen.getByRole('radio', { name: 'P' }));
    expect(screen.queryByRole('radio', { name: /Fardo/ })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Unidade' })).toBeChecked();
    expect(screen.getByText('R$ 1,00')).toBeInTheDocument();
  });

  it('trocar para variação sem a forma escolhida volta para Unidade', async () => {
    await abrirProduto();
    await userEvent.click(screen.getByRole('radio', { name: 'M' }));
    await userEvent.click(screen.getByRole('radio', { name: /Fardo/ }));
    await userEvent.click(screen.getByRole('radio', { name: 'P' }));
    expect(screen.getByRole('radio', { name: 'Unidade' })).toBeChecked();
  });

  it('miniaturas trocam a foto principal', async () => {
    await abrirProduto();
    const principal = () => screen.getAllByRole('img', { name: 'Copo descartável' })[0];
    expect(principal()).toHaveAttribute('src', 'http://x/a.webp');
    await userEvent.click(screen.getByRole('button', { name: 'Ver foto 2 de 2' }));
    expect(principal()).toHaveAttribute('src', 'http://x/b.webp');
  });

  it('adiciona ao carrinho, avisa e atualiza o selo do cabeçalho', async () => {
    await abrirProduto();
    expect(screen.queryByTestId('selo-carrinho')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar ao carrinho' }));
    expect(await screen.findByText('Adicionado ao carrinho.')).toBeInTheDocument();
    expect(screen.getByTestId('selo-carrinho')).toHaveTextContent('1');
    expect(JSON.parse(window.localStorage.getItem('reserva.carrinho'))).toHaveLength(1);
    // mesmo item de novo soma na mesma linha: o selo continua em 1
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar ao carrinho' }));
    expect(screen.getByTestId('selo-carrinho')).toHaveTextContent('1');
  });

  it('produto não encontrado mostra mensagem amigável', async () => {
    const erro = Object.assign(new Error('Produto não encontrado.'), { status: 404 });
    vi.spyOn(catalogoService, 'produto').mockRejectedValue(erro);
    renderizarLoja('/produto/x');
    expect(await screen.findByText('Produto não encontrado.')).toBeInTheDocument();
  });

  it('erro de rede oferece "Tentar novamente"', async () => {
    vi.spyOn(catalogoService, 'produto')
      .mockRejectedValueOnce(new Error('Sem conexão.'))
      .mockResolvedValue(PRODUTO_TESTE);
    renderizarLoja('/produto/p-1');
    await userEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('heading', { name: 'Copo descartável' })).toBeInTheDocument();
  });
});
