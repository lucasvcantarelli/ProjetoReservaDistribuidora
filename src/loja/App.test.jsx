import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App.jsx';
import { catalogoService } from './services/catalogoService.js';
import { empresaService } from './services/empresaService.js';

describe('App da loja', () => {
  it('mostra o nome da distribuidora como marca quando não há logo', async () => {
    vi.spyOn(empresaService, 'obter').mockResolvedValue({
      nome: 'Distribuidora Teste',
      logo_url: null,
    });
    vi.spyOn(catalogoService, 'categorias').mockResolvedValue([]);
    vi.spyOn(catalogoService, 'produtos').mockResolvedValue({ itens: [], total: 0 });
    render(<App />);
    expect(
      await screen.findByText('Distribuidora Teste', { selector: 'span' }),
    ).toBeInTheDocument();
  });
});
