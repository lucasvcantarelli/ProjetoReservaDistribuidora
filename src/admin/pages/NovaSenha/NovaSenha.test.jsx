import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../../shared/services/api.js';
import { renderizarAdmin } from '../../../test/renderizarAdmin.jsx';
import { adminAuthService } from '../../services/adminAuthService.js';

const HASH_VALIDO = '#access_token=tok.en.123&expires_in=3600&type=recovery';

function abrirComHash(hash) {
  window.history.replaceState(null, '', `/nova-senha${hash}`);
  return renderizarAdmin('/nova-senha');
}

async function preencher(senha, confirmar) {
  await userEvent.type(await screen.findByLabelText('Nova senha'), senha);
  await userEvent.type(screen.getByLabelText('Confirmar nova senha'), confirmar);
  await userEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
}

describe('NovaSenha (admin)', () => {
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('tira o token da URL e troca a senha com ele; depois vai ao login com o toast', async () => {
    const definir = vi.spyOn(adminAuthService, 'definirNovaSenha').mockResolvedValue(null);
    const roteador = abrirComHash(HASH_VALIDO);
    await vi.waitFor(() => expect(window.location.hash).toBe(''));
    await preencher('senha-nova-123', 'senha-nova-123');
    await vi.waitFor(() => expect(roteador.state.location.pathname).toBe('/entrar'));
    expect(definir).toHaveBeenCalledWith({ accessToken: 'tok.en.123', senha: 'senha-nova-123' });
    expect(await screen.findByText('Senha alterada. Entre com a nova senha.')).toBeInTheDocument();
  });

  it('senha curta ou confirmação diferente não chama o servidor', async () => {
    const definir = vi.spyOn(adminAuthService, 'definirNovaSenha').mockResolvedValue(null);
    abrirComHash(HASH_VALIDO);
    await preencher('curta', 'curta');
    expect(await screen.findByText(/pelo menos \d+ caracteres/)).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Nova senha'));
    await userEvent.clear(screen.getByLabelText('Confirmar nova senha'));
    await preencher('senha-nova-123', 'senha-nova-124');
    expect(await screen.findByText('As senhas não conferem.')).toBeInTheDocument();
    expect(definir).not.toHaveBeenCalled();
  });

  it('401 do servidor (link expirado) mostra o aviso e continua na tela', async () => {
    vi.spyOn(adminAuthService, 'definirNovaSenha').mockRejectedValue(
      new ErroApi('Link inválido ou expirado. Solicite a recuperação novamente.', { status: 401 }),
    );
    const roteador = abrirComHash(HASH_VALIDO);
    await preencher('senha-nova-123', 'senha-nova-123');
    expect(await screen.findByRole('alert')).toHaveTextContent('Link inválido ou expirado.');
    expect(roteador.state.location.pathname).toBe('/nova-senha');
  });

  it.each([
    ['sem token', ''],
    ['link expirado', '#error=access_denied&error_code=otp_expired'],
    ['tipo errado', '#access_token=abc&type=magiclink'],
  ])('%s: mostra mensagem com link para pedir novo e-mail', async (_rotulo, hash) => {
    abrirComHash(hash);
    expect(
      await screen.findByRole('heading', { name: 'Link inválido ou expirado' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Solicitar novo link' })).toHaveAttribute(
      'href',
      '/esqueci-senha',
    );
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument();
  });
});
