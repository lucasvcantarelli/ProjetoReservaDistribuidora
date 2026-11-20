import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  ADMIN_TESTE,
  SESSAO_TESTE,
  logarComoAdmin,
  renderizarAdmin,
} from '../../../test/renderizarAdmin.jsx';
import { sessaoAdmin } from '../../services/apiAdmin.js';
import { categoriasService } from '../../services/categoriasService.js';

describe('RotaAdmin e rotas do painel', () => {
  it('deslogado em /categorias vai para /entrar?voltar=/categorias', async () => {
    const roteador = renderizarAdmin('/categorias');
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(roteador.state.location.pathname).toBe('/entrar');
    expect(roteador.state.location.search).toBe('?voltar=/categorias');
  });

  it('com basename, a URL do navegador fica sob o basename e o redirecionamento também', async () => {
    const roteador = renderizarAdmin('/painel-x7k2q/categorias', { basename: '/painel-x7k2q' });
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(roteador.state.location.pathname).toBe('/painel-x7k2q/entrar');
    expect(roteador.state.location.search).toBe('?voltar=/categorias');
    expect(roteador.createHref(roteador.state.location)).toBe(
      '/painel-x7k2q/entrar?voltar=/categorias',
    );
  });

  it('logado, o índice redireciona para as categorias', async () => {
    logarComoAdmin();
    vi.spyOn(categoriasService, 'listar').mockResolvedValue([]);
    const roteador = renderizarAdmin('/');
    expect(await screen.findByRole('heading', { name: 'Categorias' })).toBeInTheDocument();
    expect(roteador.state.location.pathname).toBe('/categorias');
  });

  it('sessão guardada de quem não é admin é descartada e vai para o login', async () => {
    sessaoAdmin.salvar(SESSAO_TESTE, { ...ADMIN_TESTE, papel: 'cliente' });
    const roteador = renderizarAdmin('/categorias');
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(roteador.state.location.pathname).toBe('/entrar');
    await vi.waitFor(() => expect(sessaoAdmin.obter()).toBeNull());
  });

  it('rota desconhecida mostra "Página não encontrada."', async () => {
    renderizarAdmin('/nao-existe');
    expect(
      await screen.findByRole('heading', { name: 'Página não encontrada.' }),
    ).toBeInTheDocument();
  });
});
