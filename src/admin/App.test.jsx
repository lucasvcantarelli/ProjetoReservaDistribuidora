import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App.jsx';
import { empresaPublicaService } from './services/empresaPublicaService.js';

describe('App do admin', () => {
  it('sem sessão mostra o login do painel', async () => {
    vi.spyOn(empresaPublicaService, 'obter').mockResolvedValue({ nome: 'Reserva', logo_url: null });
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.getByText('Painel administrativo')).toBeInTheDocument();
  });
});
