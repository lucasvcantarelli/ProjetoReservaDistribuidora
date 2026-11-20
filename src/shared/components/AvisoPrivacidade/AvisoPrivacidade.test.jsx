import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CHAVE_AVISO_PRIVACIDADE } from '../../services/avisoPrivacidadeService.js';
import AvisoPrivacidade from './AvisoPrivacidade';

function abrir() {
  return render(
    <MemoryRouter>
      <AvisoPrivacidade />
      <button type="button">Outro botão</button>
    </MemoryRouter>,
  );
}

const aviso = () => screen.queryByRole('region', { name: 'Aviso de privacidade' });
const ALTURA = '--altura-aviso-privacidade';

describe('AvisoPrivacidade', () => {
  it('aparece na primeira visita, com o texto, o link e sem roubar o foco', () => {
    abrir();
    expect(aviso()).toBeInTheDocument();
    expect(aviso()).toHaveTextContent(
      'Usamos apenas o armazenamento essencial do navegador para o carrinho e, se você quiser, para lembrar seus dados. Não usamos cookies de rastreamento.',
    );
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute(
      'href',
      '/privacidade',
    );
    expect(document.body).toHaveFocus();
  });

  it('no painel mostra o texto da sessão de administrador, sem falar em carrinho', () => {
    render(
      <MemoryRouter>
        <AvisoPrivacidade contexto="admin" />
      </MemoryRouter>,
    );
    expect(aviso()).toHaveTextContent(
      'Este painel usa apenas o armazenamento essencial do navegador para manter sua sessão de administrador. Não usamos cookies de rastreamento.',
    );
    expect(aviso()).not.toHaveTextContent(/carrinho/);
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toBeInTheDocument();
  });

  it('some ao clicar em Entendi, grava a preferência e não volta', async () => {
    const { unmount } = abrir();
    await userEvent.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(aviso()).not.toBeInTheDocument();
    expect(window.localStorage.getItem(CHAVE_AVISO_PRIVACIDADE)).toBe('true');
    unmount();
    abrir();
    expect(aviso()).not.toBeInTheDocument();
  });

  it('não bloqueia a tela: o resto da página continua acessível', () => {
    abrir();
    expect(screen.getByRole('button', { name: 'Outro botão' })).toBeEnabled();
    expect(document.querySelector('[inert]')).toBeNull();
  });

  it('com o armazenamento bloqueado, Entendi só esconde o aviso, sem erro', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    abrir();
    expect(aviso()).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(aviso()).not.toBeInTheDocument();
  });

  it('reserva espaço no fim da página enquanto aparece e devolve ao sumir', async () => {
    abrir();
    expect(document.documentElement.style.getPropertyValue(ALTURA)).toBe('0px');
    await userEvent.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(document.documentElement.style.getPropertyValue(ALTURA)).toBe('');
  });
});
