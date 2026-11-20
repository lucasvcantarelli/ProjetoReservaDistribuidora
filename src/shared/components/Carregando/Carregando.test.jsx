import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Carregando from './Carregando';

describe('Carregando', () => {
  it('anuncia "Carregando…" para leitores de tela', () => {
    render(<Carregando />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
  });
});
