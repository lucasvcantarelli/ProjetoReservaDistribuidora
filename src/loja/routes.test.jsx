import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderizarLoja } from '../test/renderizarLoja.jsx';
import { catalogoService } from './services/catalogoService.js';

describe('rotas da loja', () => {
  it.each(['/entrar', '/cadastro', '/esqueci-senha', '/nova-senha', '/minha-conta'])(
    '%s não existe mais: cai na página não encontrada',
    async (rota) => {
      vi.spyOn(catalogoService, 'categorias').mockResolvedValue([]);
      renderizarLoja(rota);
      expect(await screen.findByText('Página não encontrada.')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /entrar|minha conta/i })).not.toBeInTheDocument();
    },
  );
});
