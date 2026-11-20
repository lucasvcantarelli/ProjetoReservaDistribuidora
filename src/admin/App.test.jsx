import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App.jsx';

describe('App do admin', () => {
  it('sem sessão mostra o login do painel', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.getByText('Painel administrativo')).toBeInTheDocument();
  });
});
