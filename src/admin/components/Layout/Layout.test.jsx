import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { logarComoAdmin, renderizarAdmin } from '../../../test/renderizarAdmin.jsx';
import { adminAuthService } from '../../services/adminAuthService.js';
import { sessaoAdmin } from '../../services/apiAdmin.js';
import { categoriasService } from '../../services/categoriasService.js';
import { empresaPublicaService } from '../../services/empresaPublicaService.js';

function abrirPainel(url = '/categorias') {
  logarComoAdmin();
  vi.spyOn(categoriasService, 'listar').mockResolvedValue([]);
  return renderizarAdmin(url);
}

describe('Layout do painel', () => {
  it('mostra o menu com os links e marca o ativo', async () => {
    abrirPainel();
    const menu = await screen.findByRole('navigation', { name: 'Menu principal' });
    ['Categorias', 'Produtos', 'Clientes', 'Configurações'].forEach((nome) =>
      expect(within(menu).getByRole('link', { name: nome })).toBeInTheDocument(),
    );
    expect(within(menu).getByRole('link', { name: 'Categorias' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('navegar pelo menu troca de página', async () => {
    const roteador = abrirPainel();
    await userEvent.click(await screen.findByRole('link', { name: 'Clientes' }));
    expect(roteador.state.location.pathname).toBe('/clientes');
  });

  it('Sair encerra a sessão e volta ao login', async () => {
    const sair = vi.spyOn(adminAuthService, 'sair').mockResolvedValue({});
    const roteador = abrirPainel();
    await userEvent.click(await screen.findByRole('button', { name: 'Sair' }));
    await vi.waitFor(() => expect(roteador.state.location.pathname).toBe('/entrar'));
    expect(sair).toHaveBeenCalled();
    expect(sessaoAdmin.obter()).toBeNull();
  });

  describe('gaveta do menu (celular)', () => {
    it('o botão abre, foca o primeiro link e deixa o conteúdo inerte', async () => {
      abrirPainel();
      const botao = await screen.findByRole('button', { name: 'Abrir menu' });
      expect(botao).toHaveAttribute('aria-expanded', 'false');
      await userEvent.click(botao);
      expect(screen.getByRole('button', { name: 'Fechar menu' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
      expect(screen.getByRole('link', { name: 'Categorias' })).toHaveFocus();
      expect(screen.getByRole('main', { hidden: true })).toHaveAttribute('inert');
    });

    it('Esc fecha e devolve o foco ao botão do menu', async () => {
      abrirPainel();
      await userEvent.click(await screen.findByRole('button', { name: 'Abrir menu' }));
      await userEvent.keyboard('{Escape}');
      const botao = screen.getByRole('button', { name: 'Abrir menu' });
      expect(botao).toHaveAttribute('aria-expanded', 'false');
      expect(botao).toHaveFocus();
      expect(screen.getByRole('main')).not.toHaveAttribute('inert');
    });

    it('escolher um link fecha a gaveta', async () => {
      const roteador = abrirPainel();
      await userEvent.click(await screen.findByRole('button', { name: 'Abrir menu' }));
      await userEvent.click(screen.getByRole('link', { name: 'Produtos' }));
      expect(roteador.state.location.pathname).toBe('/produtos');
      expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
      expect(screen.getByRole('heading', { name: 'Produtos' })).toHaveFocus();
    });

    it('fecha sozinha quando a tela passa a ser larga, sem deixar o conteúdo inerte', async () => {
      let aoMudar;
      vi.stubGlobal('matchMedia', () => ({
        matches: false,
        addEventListener: (_tipo, ouvinte) => (aoMudar = ouvinte),
        removeEventListener: () => {},
      }));
      abrirPainel();
      await userEvent.click(await screen.findByRole('button', { name: 'Abrir menu' }));
      expect(screen.getByRole('main', { hidden: true })).toHaveAttribute('inert');
      act(() => aoMudar({ matches: true }));
      expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
      expect(screen.getByRole('main')).not.toHaveAttribute('inert');
      vi.unstubAllGlobals();
    });
  });
  describe('marca e crédito', () => {
    it('mostra a logo da empresa no topo quando ela foi enviada', async () => {
      vi.spyOn(empresaPublicaService, 'obter').mockResolvedValue({
        nome: 'Reserva Distribuidora',
        logo_url: 'https://cdn.exemplo/logo.webp',
      });
      abrirPainel();
      const logos = await screen.findAllByRole('img', { name: 'Logo Reserva Distribuidora' });
      expect(logos[0]).toHaveAttribute('src', 'https://cdn.exemplo/logo.webp');
    });

    it('sem logo (ou se a leitura falhar) mostra só o texto', async () => {
      vi.spyOn(empresaPublicaService, 'obter').mockRejectedValue(new Error('sem rede'));
      abrirPainel();
      const menu = await screen.findByRole('navigation', { name: 'Menu principal' });
      expect(menu).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.getAllByText('Painel administrativo').length).toBeGreaterThan(0);
    });

    it('o menu traz "Desenvolvido por CantarelliTech" com link em nova aba', async () => {
      abrirPainel();
      const link = await screen.findByRole('link', { name: 'CantarelliTech' });
      expect(link).toHaveAttribute('href', 'https://www.cantarellitech.com.br');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });
});
