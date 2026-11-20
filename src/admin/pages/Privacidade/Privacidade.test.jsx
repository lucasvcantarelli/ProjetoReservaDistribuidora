import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { logarComoAdmin, renderizarAdmin } from '../../../test/renderizarAdmin.jsx';
import { categoriasService } from '../../services/categoriasService.js';
import { empresaPublicaService } from '../../services/empresaPublicaService.js';

const TITULO_POLITICA = { level: 1, name: /Política de Privacidade/ };

describe('Privacidade (admin)', () => {
  it('abre sem sessão, sem redirecionar ao login, com os dados públicos da empresa', async () => {
    vi.spyOn(empresaPublicaService, 'obter').mockResolvedValue({
      nome: 'Distribuidora Teste',
      email_privacidade: 'lgpd@teste.com',
    });
    const roteador = renderizarAdmin('/privacidade');
    expect(await screen.findByRole('heading', TITULO_POLITICA)).toBeInTheDocument();
    expect(await screen.findAllByRole('link', { name: 'lgpd@teste.com' })).not.toHaveLength(0);
    expect(roteador.state.location.pathname).toBe('/privacidade');
  });

  it('mostra a política mesmo se a configuração pública falhar', async () => {
    vi.spyOn(empresaPublicaService, 'obter').mockRejectedValue(new Error('sem rede'));
    renderizarAdmin('/privacidade');
    expect(await screen.findByRole('heading', TITULO_POLITICA)).toBeInTheDocument();
    expect(await screen.findAllByText(/pelos canais de atendimento da empresa/)).toHaveLength(2);
  });

  it('a tela de login tem o link para a política e o aviso de privacidade', async () => {
    renderizarAdmin('/entrar');
    const aviso = await screen.findByRole('region', { name: 'Aviso de privacidade' });
    const link = screen
      .getAllByRole('link', { name: 'Política de Privacidade' })
      .find((item) => !aviso.contains(item));
    expect(link).toHaveAttribute('href', '/privacidade');
    expect(aviso).toBeInTheDocument();
  });

  it('o aviso do painel fala da sessão de administrador', async () => {
    renderizarAdmin('/entrar');
    expect(await screen.findByRole('region', { name: 'Aviso de privacidade' })).toHaveTextContent(
      /manter sua sessão de administrador/,
    );
  });

  it('o aviso some depois de Entendi', async () => {
    renderizarAdmin('/entrar');
    await userEvent.click(await screen.findByRole('button', { name: 'Entendi' }));
    expect(screen.queryByRole('region', { name: 'Aviso de privacidade' })).not.toBeInTheDocument();
  });

  it('logado, o menu lateral tem o link para a política', async () => {
    logarComoAdmin();
    vi.spyOn(categoriasService, 'listar').mockResolvedValue([]);
    renderizarAdmin('/categorias');
    const menu = await screen.findByRole('complementary', { hidden: true });
    expect(
      within(menu).getByRole('link', { name: 'Política de Privacidade', hidden: true }),
    ).toHaveAttribute('href', '/privacidade');
  });
});
