import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmProvider } from '../contexts/ConfirmContext.jsx';
import { ToastProvider } from '../contexts/ToastContext.jsx';
import { useConfirm } from './useConfirm.js';
import { useToast } from './useToast.js';

function Tela() {
  const { mostrar } = useToast();
  return (
    <>
      <button onClick={() => mostrar({ tipo: 'erro', texto: 'Deu ruim' })}>Avisar</button>
      <button onClick={() => mostrar({ texto: 'Segundo' })}>Outro</button>
    </>
  );
}

function renderizar() {
  render(
    <ToastProvider>
      <Tela />
    </ToastProvider>,
  );
}

describe('useToast', () => {
  afterEach(() => vi.useRealTimers());

  it('mostra o aviso numa região aria-live polite e some após 4 s', () => {
    vi.useFakeTimers();
    renderizar();
    act(() => screen.getByText('Avisar').click());
    expect(screen.getByText('Deu ruim')).toBeInTheDocument();
    expect(screen.getByText('Deu ruim').closest('[aria-live="polite"]')).not.toBeNull();
    act(() => vi.advanceTimersByTime(3999));
    expect(screen.getByText('Deu ruim')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText('Deu ruim')).not.toBeInTheDocument();
  });

  it('pode ser dispensado pelo botão', async () => {
    renderizar();
    await userEvent.click(screen.getByText('Avisar'));
    await userEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(screen.queryByText('Deu ruim')).not.toBeInTheDocument();
  });

  it('cada aviso tem seu próprio temporizador de 4 s', () => {
    vi.useFakeTimers();
    renderizar();
    act(() => screen.getByText('Avisar').click());
    act(() => vi.advanceTimersByTime(3000));
    act(() => screen.getByText('Outro').click());
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByText('Deu ruim')).not.toBeInTheDocument();
    expect(screen.getByText('Segundo')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.queryByText('Segundo')).not.toBeInTheDocument();
  });

  it('aviso mostrado com um modal aberto não fica dentro de ancestral inert', async () => {
    function ComModal() {
      const { confirmar } = useConfirm();
      const { mostrar } = useToast();
      return (
        <button
          onClick={() => {
            confirmar({ titulo: 'Certeza?' });
            mostrar({ texto: 'Aviso com modal' });
          }}
        >
          Abrir
        </button>
      );
    }
    render(
      <ToastProvider>
        <ConfirmProvider>
          <ComModal />
        </ConfirmProvider>
      </ToastProvider>,
    );
    await userEvent.click(screen.getByText('Abrir'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Aviso com modal').closest('[inert]')).toBeNull();
  });
});
