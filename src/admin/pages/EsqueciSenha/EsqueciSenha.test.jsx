import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../../shared/services/api.js';
import { renderizarAdmin } from '../../../test/renderizarAdmin.jsx';
import { adminAuthService } from '../../services/adminAuthService.js';

const NEUTRA = 'Se o e-mail estiver cadastrado, você receberá um link.';

describe('EsqueciSenha (admin)', () => {
  it('é pública e o login tem o link "Esqueci minha senha"', async () => {
    const roteador = renderizarAdmin('/entrar');
    await userEvent.click(await screen.findByRole('link', { name: 'Esqueci minha senha' }));
    expect(roteador.state.location.pathname).toBe('/esqueci-senha');
    expect(await screen.findByRole('heading', { name: 'Esqueci minha senha' })).toBeInTheDocument();
  });

  it('envia o e-mail e mostra a mensagem neutra do servidor', async () => {
    const recuperar = vi.spyOn(adminAuthService, 'recuperarSenha').mockResolvedValue(NEUTRA);
    renderizarAdmin('/esqueci-senha');
    await userEvent.type(await screen.findByLabelText('E-mail'), ' admin@x.com ');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
    expect(await screen.findByText(NEUTRA)).toBeInTheDocument();
    expect(recuperar).toHaveBeenCalledWith({ email: 'admin@x.com' });
  });

  it('mostra o erro do servidor (ex.: e-mail inválido, muitas tentativas)', async () => {
    vi.spyOn(adminAuthService, 'recuperarSenha').mockRejectedValue(
      new ErroApi('Informe um e-mail válido.', { status: 400 }),
    );
    renderizarAdmin('/esqueci-senha');
    await userEvent.type(await screen.findByLabelText('E-mail'), 'x@y.z');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Informe um e-mail válido.');
  });
});
