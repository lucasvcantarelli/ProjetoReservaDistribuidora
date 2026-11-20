import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderizarLoja } from '../../../test/renderizarLoja.jsx';
import { catalogoService } from '../../services/catalogoService.js';

const CATEGORIAS = [
  { id: 'c1', nome: 'Copos', slug: 'copos' },
  { id: 'c2', nome: 'Pratos', slug: 'pratos' },
];
const PRODUTO = {
  id: 'p1',
  nome: 'Copo descartável',
  foto_url: 'http://x/a.webp',
  a_partir_de_centavos: 1990,
};

function mockarCatalogo(resposta = { itens: [PRODUTO], total: 1 }) {
  vi.spyOn(catalogoService, 'categorias').mockResolvedValue(CATEGORIAS);
  return vi.spyOn(catalogoService, 'produtos').mockResolvedValue(resposta);
}

describe('Catálogo', () => {
  it('sem produtos mostra "Nenhum produto cadastrado ainda."', async () => {
    mockarCatalogo({ itens: [], total: 0 });
    renderizarLoja('/');
    expect(await screen.findByText('Nenhum produto cadastrado ainda.')).toBeInTheDocument();
  });

  it('mostra o preço sem exigir login, com foto e alt', async () => {
    mockarCatalogo();
    renderizarLoja('/');
    expect(await screen.findByText('R$ 19,90')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Copo descartável' })).toHaveAttribute(
      'loading',
      'lazy',
    );
    expect(screen.getByRole('link', { name: /Copo descartável/ })).toHaveAttribute(
      'href',
      '/produto/p1',
    );
  });

  it('a URL define categoria, busca e página', async () => {
    const produtos = mockarCatalogo({ itens: [PRODUTO], total: 60 });
    renderizarLoja('/categoria/copos?busca=copo&pagina=2');
    await screen.findByText('R$ 19,90');
    expect(produtos).toHaveBeenCalledWith({ categoriaSlug: 'copos', busca: 'copo', pagina: 2 });
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Copos' })).toHaveAttribute('aria-current', 'page');
  });

  it('digitar na busca atualiza a URL após o atraso e refaz a consulta', async () => {
    const produtos = mockarCatalogo();
    const roteador = renderizarLoja('/');
    await screen.findByText('R$ 19,90');
    await userEvent.type(screen.getByRole('searchbox'), 'prato');
    await waitFor(() => expect(roteador.state.location.search).toBe('?busca=prato'));
    await waitFor(() =>
      expect(produtos).toHaveBeenLastCalledWith({
        categoriaSlug: undefined,
        busca: 'prato',
        pagina: 1,
      }),
    );
  });

  it('mudar de página atualiza ?pagina= na URL', async () => {
    mockarCatalogo({ itens: [PRODUTO], total: 60 });
    const roteador = renderizarLoja('/');
    await userEvent.click(await screen.findByRole('button', { name: 'Próxima' }));
    expect(roteador.state.location.search).toBe('?pagina=2');
  });

  it('ao trocar de categoria mostra carregamento em vez dos produtos antigos', async () => {
    const produtos = mockarCatalogo();
    renderizarLoja('/');
    await screen.findByText('R$ 19,90');
    produtos.mockReturnValue(new Promise(() => {}));
    await userEvent.click(screen.getByRole('link', { name: 'Copos' }));
    expect(await screen.findByRole('status', { name: 'Carregando produtos' })).toBeInTheDocument();
    expect(screen.queryByText('R$ 19,90')).not.toBeInTheDocument();
  });

  it('erro mostra mensagem e "Tentar novamente" recarrega', async () => {
    const produtos = mockarCatalogo();
    produtos.mockRejectedValueOnce(new Error('Falha de rede.'));
    renderizarLoja('/');
    expect(await screen.findByText('Falha de rede.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('R$ 19,90')).toBeInTheDocument();
  });
});
