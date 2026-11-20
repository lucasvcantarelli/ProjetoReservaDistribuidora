import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Botao from './Botao';

describe('Botao', () => {
  it('dispara onClick e tem type="button" por padrão', async () => {
    const aoClicar = vi.fn();
    render(<Botao onClick={aoClicar}>Salvar</Botao>);
    const botao = screen.getByRole('button', { name: 'Salvar' });
    expect(botao).toHaveAttribute('type', 'button');
    await userEvent.click(botao);
    expect(aoClicar).toHaveBeenCalledTimes(1);
  });

  it('carregando desabilita, marca aria-busy e não dispara onClick', async () => {
    const aoClicar = vi.fn();
    render(
      <Botao carregando onClick={aoClicar}>
        Salvar
      </Botao>,
    );
    const botao = screen.getByRole('button', { name: 'Salvar' });
    expect(botao).toBeDisabled();
    expect(botao).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(botao);
    expect(aoClicar).not.toHaveBeenCalled();
  });

  it('com href renderiza um link', () => {
    render(
      <Botao href="https://wa.me/55" target="_blank" rel="noopener noreferrer">
        Abrir
      </Botao>,
    );
    const link = screen.getByRole('link', { name: 'Abrir' });
    expect(link).toHaveAttribute('href', 'https://wa.me/55');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('é acionável pelo teclado', async () => {
    const aoClicar = vi.fn();
    render(<Botao onClick={aoClicar}>Ok</Botao>);
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    expect(aoClicar).toHaveBeenCalledTimes(1);
  });
});
