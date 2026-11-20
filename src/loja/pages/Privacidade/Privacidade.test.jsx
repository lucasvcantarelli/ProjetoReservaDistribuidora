import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderizarLoja } from '../../../test/renderizarLoja.jsx';
import { carrinhoService } from '../../services/carrinhoService.js';
import { catalogoService } from '../../services/catalogoService.js';
import { pedidoService } from '../../services/pedidoService.js';

const TITULO_POLITICA = { level: 1, name: /Política de Privacidade/ };

function simularCatalogo() {
  vi.spyOn(catalogoService, 'categorias').mockResolvedValue([]);
  vi.spyOn(catalogoService, 'produtos').mockResolvedValue({ itens: [], total: 0 });
}

describe('Privacidade (loja)', () => {
  it('/privacidade mostra a política com os dados da empresa e o título da aba', async () => {
    renderizarLoja('/privacidade', {
      empresa: { nome: 'Distribuidora Teste', email_privacidade: 'lgpd@teste.com' },
    });
    expect(await screen.findByRole('heading', TITULO_POLITICA)).toBeInTheDocument();
    expect(await screen.findAllByRole('link', { name: 'lgpd@teste.com' })).not.toHaveLength(0);
    await vi.waitFor(() =>
      expect(document.title).toBe('Política de Privacidade — Distribuidora Teste'),
    );
  });

  it('o rodapé leva à política, mesmo com o aviso aberto', async () => {
    simularCatalogo();
    renderizarLoja('/');
    expect(await screen.findByRole('region', { name: 'Aviso de privacidade' })).toBeInTheDocument();
    const link = within(screen.getByRole('contentinfo')).getByRole('link', {
      name: 'Política de Privacidade',
    });
    expect(link).toHaveAttribute('href', '/privacidade');
    await userEvent.click(link);
    expect(await screen.findByRole('heading', TITULO_POLITICA)).toBeInTheDocument();
  });

  it('o aviso aparece na loja e some depois de Entendi', async () => {
    simularCatalogo();
    renderizarLoja('/');
    await userEvent.click(await screen.findByRole('button', { name: 'Entendi' }));
    expect(screen.queryByRole('region', { name: 'Aviso de privacidade' })).not.toBeInTheDocument();
  });

  it('a tela de finalizar tem o link "Saiba como guardamos seus dados" para a política', async () => {
    carrinhoService.adicionar({
      variacao_id: 'v1',
      forma: 'unidade',
      quantidade: 1,
      produto_id: 'p1',
      produto_nome: 'Copo',
      nome_tamanho: 'M',
      preco_centavos: 100,
      foto_url: null,
    });
    vi.spyOn(pedidoService, 'revisar').mockResolvedValue({
      itens: [],
      divergencias: [],
      total_centavos: 100,
    });
    renderizarLoja('/finalizar');
    const link = await screen.findByRole('link', { name: 'Saiba como guardamos seus dados' });
    expect(link).toHaveAttribute('href', '/privacidade');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
