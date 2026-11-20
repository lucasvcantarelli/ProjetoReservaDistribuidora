import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderizarLoja } from '../../../test/renderizarLoja.jsx';
import { catalogoService } from '../../services/catalogoService.js';

const PRODUTO = { id: 'p1', nome: 'Copo', foto_url: null, a_partir_de_centavos: 100 };
const ESPERA_DEBOUNCE_MS = 500;

describe('Cabecalho - busca', () => {
  beforeEach(() => {
    vi.spyOn(catalogoService, 'categorias').mockResolvedValue([]);
    vi.spyOn(catalogoService, 'produtos').mockResolvedValue({ itens: [PRODUTO], total: 1 });
    vi.spyOn(catalogoService, 'produto').mockResolvedValue(new Promise(() => {}));
  });

  it('abrir um produto antes do atraso cancela a busca pendente', async () => {
    const roteador = renderizarLoja('/');
    await userEvent.type(screen.getByRole('searchbox'), 'pra');
    await userEvent.click(await screen.findByRole('link', { name: /Copo/ }));
    expect(roteador.state.location.pathname).toBe('/produto/p1');
    await new Promise((resolver) => setTimeout(resolver, ESPERA_DEBOUNCE_MS));
    expect(roteador.state.location.pathname).toBe('/produto/p1');
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });

  it('digitar numa página que não é a listagem leva à busca em /', async () => {
    const roteador = renderizarLoja('/carrinho');
    await userEvent.type(screen.getByRole('searchbox'), 'copo');
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/'));
    expect(roteador.state.location.search).toBe('?busca=copo');
  });
});

describe('Cabecalho - sem conta de cliente', () => {
  it('não mostra entrar nem menu de conta e mantém o carrinho', async () => {
    vi.spyOn(catalogoService, 'categorias').mockResolvedValue([]);
    vi.spyOn(catalogoService, 'produtos').mockResolvedValue({ itens: [], total: 0 });
    renderizarLoja('/');
    expect(await screen.findByRole('link', { name: /Carrinho/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /entrar|conta|cadastr/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /conta|sair/i })).not.toBeInTheDocument();
  });
});
