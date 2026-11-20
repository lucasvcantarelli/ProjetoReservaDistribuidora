import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ConfirmProvider } from '../contexts/ConfirmContext.jsx';
import { useConfirm } from './useConfirm.js';

function Tela({ aoResponder }) {
  const { confirmar } = useConfirm();
  async function pedir() {
    aoResponder(await confirmar({ titulo: 'Excluir?', texto: 'Não dá para desfazer.' }));
  }
  return <button onClick={pedir}>Excluir</button>;
}

function renderizar() {
  const respostas = [];
  render(
    <ConfirmProvider>
      <Tela aoResponder={(r) => respostas.push(r)} />
    </ConfirmProvider>,
  );
  return respostas;
}

describe('useConfirm', () => {
  it('resolve false ao apertar Esc', async () => {
    const respostas = renderizar();
    await userEvent.click(screen.getByText('Excluir'));
    expect(screen.getByRole('dialog', { name: 'Excluir?' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(respostas).toEqual([false]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('resolve false ao cancelar e true ao confirmar', async () => {
    const respostas = renderizar();
    await userEvent.click(screen.getByText('Excluir'));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await userEvent.click(screen.getByText('Excluir'));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(respostas).toEqual([false, true]);
  });

  it('falha com mensagem clara fora do provider', () => {
    function Solto() {
      useConfirm();
      return null;
    }
    expect(() => render(<Solto />)).toThrow(/ConfirmProvider/);
  });
});
