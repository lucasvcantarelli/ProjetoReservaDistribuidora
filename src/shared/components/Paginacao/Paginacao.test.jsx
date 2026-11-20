import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Paginacao from './Paginacao';

describe('Paginacao', () => {
  it('mostra "Página X de Y" e desabilita Anterior na primeira página', () => {
    render(<Paginacao pagina={1} totalPaginas={3} onMudar={() => {}} />);
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeEnabled();
  });

  it('desabilita Próxima na última página', () => {
    render(<Paginacao pagina={3} totalPaginas={3} onMudar={() => {}} />);
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled();
  });

  it('chama onMudar com a página vizinha', async () => {
    const onMudar = vi.fn();
    render(<Paginacao pagina={2} totalPaginas={3} onMudar={onMudar} />);
    await userEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    await userEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(onMudar).toHaveBeenNthCalledWith(1, 3);
    expect(onMudar).toHaveBeenNthCalledWith(2, 1);
  });
});
