import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../../shared/services/api.js';
import {
  ADMIN_TESTE,
  SESSAO_TESTE,
  logarComoAdmin,
  renderizarAdmin,
} from '../../../test/renderizarAdmin.jsx';
import { sessaoAdmin } from '../../services/apiAdmin.js';
import { adminAuthService } from '../../services/adminAuthService.js';
import { categoriasService } from '../../services/categoriasService.js';

async function preencherEEnviar() {
  await userEvent.type(await screen.findByLabelText('E-mail'), 'admin@x.com');
  await userEvent.type(screen.getByLabelText('Senha'), 'segredo123');
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('Entrar (admin)', () => {
  it('entra com o painel "admin" e vai para as categorias', async () => {
    const entrar = vi
      .spyOn(adminAuthService, 'entrar')
      .mockResolvedValue({ sessao: SESSAO_TESTE, usuario: ADMIN_TESTE });
    vi.spyOn(categoriasService, 'listar').mockResolvedValue([]);
    const roteador = renderizarAdmin('/entrar');
    await preencherEEnviar();
    await vi.waitFor(() => expect(roteador.state.location.pathname).toBe('/categorias'));
    expect(entrar).toHaveBeenCalledWith({ email: 'admin@x.com', senha: 'segredo123' });
    expect(sessaoAdmin.obter().usuario.nome).toBe('Admin');
  });

  it('volta para a rota pedida depois do login', async () => {
    vi.spyOn(adminAuthService, 'entrar').mockResolvedValue({
      sessao: SESSAO_TESTE,
      usuario: ADMIN_TESTE,
    });
    const roteador = renderizarAdmin('/entrar?voltar=/clientes');
    await preencherEEnviar();
    await vi.waitFor(() => expect(roteador.state.location.pathname).toBe('/clientes'));
  });

  it.each(['//mal.com', 'https://mal.com', '/\\mal.com'])(
    'ignora voltar=%s (open redirect) e vai para as categorias',
    async (voltar) => {
      vi.spyOn(adminAuthService, 'entrar').mockResolvedValue({
        sessao: SESSAO_TESTE,
        usuario: ADMIN_TESTE,
      });
      vi.spyOn(categoriasService, 'listar').mockResolvedValue([]);
      const roteador = renderizarAdmin(`/entrar?voltar=${encodeURIComponent(voltar)}`);
      await preencherEEnviar();
      await vi.waitFor(() => expect(roteador.state.location.pathname).toBe('/categorias'));
    },
  );

  it('429 mostra a mensagem de muitas tentativas e não cria sessão', async () => {
    vi.spyOn(adminAuthService, 'entrar').mockRejectedValue(
      new ErroApi('Muitas tentativas. Tente novamente em alguns minutos.', { status: 429 }),
    );
    renderizarAdmin('/entrar');
    await preencherEEnviar();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Muitas tentativas. Tente novamente em alguns minutos.',
    );
    expect(sessaoAdmin.obter()).toBeNull();
  });

  it('401 mostra a mensagem genérica do servidor', async () => {
    vi.spyOn(adminAuthService, 'entrar').mockRejectedValue(
      new ErroApi('E-mail ou senha inválidos.', { status: 401 }),
    );
    renderizarAdmin('/entrar');
    await preencherEEnviar();
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.');
  });

  it('já logado, o login redireciona para as categorias', async () => {
    logarComoAdmin();
    vi.spyOn(categoriasService, 'listar').mockResolvedValue([]);
    const roteador = renderizarAdmin('/entrar');
    await vi.waitFor(() => expect(roteador.state.location.pathname).toBe('/categorias'));
  });
});
