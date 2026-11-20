import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderizarLoja } from '../../../test/renderizarLoja.jsx';
import { catalogoService } from '../../services/catalogoService.js';

function abrir(empresa) {
  vi.spyOn(catalogoService, 'categorias').mockResolvedValue([]);
  vi.spyOn(catalogoService, 'produtos').mockResolvedValue({ itens: [], total: 0 });
  renderizarLoja('/', { empresa });
}

describe('Rodape', () => {
  it('mostra o WhatsApp formatado como link wa.me em nova aba', async () => {
    abrir({ whatsapp: '5581999990000' });
    const link = await screen.findByRole('link', { name: '+55 (81) 99999-0000' });
    expect(link).toHaveAttribute('href', 'https://wa.me/5581999990000');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('sem WhatsApp não mostra a linha', async () => {
    abrir({ whatsapp: null });
    await screen.findByText(/©/);
    expect(screen.queryByText(/WhatsApp:/)).not.toBeInTheDocument();
  });

  it('mostra "Desenvolvido por CantarelliTech" com link em nova aba', async () => {
    abrir({});
    const link = await screen.findByRole('link', { name: 'CantarelliTech' });
    expect(link).toHaveAttribute('href', 'https://www.cantarellitech.com.br');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link.closest('p')).toHaveTextContent('Desenvolvido por CantarelliTech');
  });
});
