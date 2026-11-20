import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../../shared/services/api.js';
import { logarComoAdmin, renderizarAdmin } from '../../../test/renderizarAdmin.jsx';
import { categoriasService } from '../../services/categoriasService.js';
import { produtosService } from '../../services/produtosService.js';

const COPO = {
  id: 'p1',
  nome: 'Copo descartável',
  ativo: true,
  categoria_id: 'c1',
  categoria_nome: 'Copos',
  foto_url: 'http://x/capa.webp',
  a_partir_de_centavos: 8500,
  total_variacoes: 2,
};
const PRATO = {
  id: 'p2',
  nome: 'Prato',
  ativo: false,
  categoria_id: 'c2',
  categoria_nome: 'Pratos',
  foto_url: null,
  a_partir_de_centavos: null,
  total_variacoes: 1,
};

function abrir(url = '/produtos', itens = [COPO, PRATO], total = itens.length) {
  logarComoAdmin();
  vi.spyOn(categoriasService, 'listar').mockResolvedValue([
    { id: 'c1', nome: 'Copos', ativo: true },
    { id: 'c2', nome: 'Pratos', ativo: true },
  ]);
  const listar = vi.spyOn(produtosService, 'listar').mockResolvedValue({ itens, total });
  return { roteador: renderizarAdmin(url), listar };
}

describe('Produtos', () => {
  it('lista miniatura, nome, categoria, "a partir de", tamanhos e status', async () => {
    abrir();
    const linha = (await screen.findByText('Copo descartável')).closest('tr');
    expect(linha.querySelector('img')).toHaveAttribute('src', 'http://x/capa.webp');
    expect(within(linha).getByText('Copos')).toBeInTheDocument();
    expect(within(linha).getByText('R$ 85,00')).toBeInTheDocument();
    expect(within(linha).getByText('2 tamanhos')).toBeInTheDocument();
    expect(within(linha).getByText('Ativo')).toBeInTheDocument();
    const outra = screen.getByText('Prato').closest('tr');
    expect(within(outra).getByRole('img', { name: 'Sem foto' })).toBeInTheDocument();
    expect(within(outra).getByText('1 tamanho')).toBeInTheDocument();
    expect(within(outra).getByText('Inativo')).toBeInTheDocument();
  });

  it('sem produtos mostra o estado vazio', async () => {
    abrir('/produtos', []);
    expect(await screen.findByText('Nenhum produto ainda.')).toBeInTheDocument();
  });

  it('Novo produto e Editar levam às rotas certas', async () => {
    const { roteador } = abrir();
    await userEvent.click(await screen.findByRole('button', { name: 'Editar Prato' }));
    expect(roteador.state.location.pathname).toBe('/produtos/p2');
  });

  it('busca com atraso grava ?busca= na URL e recarrega a lista', async () => {
    const { roteador, listar } = abrir();
    await userEvent.type(await screen.findByLabelText('Buscar'), 'copo');
    await waitFor(() => expect(roteador.state.location.search).toBe('?busca=copo'));
    await waitFor(() =>
      expect(listar).toHaveBeenLastCalledWith({ busca: 'copo', categoriaId: '', pagina: 1 }),
    );
  });

  it('filtro de categoria usa ?categoria= e volta para a página 1', async () => {
    const { roteador, listar } = abrir('/produtos?pagina=2', [COPO], 40);
    await screen.findByText('Copo descartável');
    await userEvent.selectOptions(screen.getByLabelText('Categoria'), 'c1');
    await waitFor(() => expect(roteador.state.location.search).toBe('?categoria=c1'));
    expect(listar).toHaveBeenLastCalledWith({ busca: '', categoriaId: 'c1', pagina: 1 });
  });

  it('pagina pela URL (?pagina=)', async () => {
    const { roteador, listar } = abrir('/produtos', [COPO], 50);
    await userEvent.click(await screen.findByRole('button', { name: 'Próxima' }));
    await waitFor(() => expect(roteador.state.location.search).toBe('?pagina=2'));
    expect(listar).toHaveBeenLastCalledWith({ busca: '', categoriaId: '', pagina: 2 });
  });

  describe('excluir', () => {
    it('confirma com o aviso das fotos e, confirmado, exclui e recarrega', async () => {
      const { listar } = abrir();
      const excluir = vi.spyOn(produtosService, 'excluir').mockResolvedValue({ id: 'p1' });
      await userEvent.click(
        await screen.findByRole('button', { name: 'Excluir Copo descartável' }),
      );
      expect(excluir).not.toHaveBeenCalled();
      const dialogo = screen.getByRole('dialog', { name: 'Excluir Copo descartável?' });
      expect(within(dialogo).getByText('As fotos também serão apagadas.')).toBeInTheDocument();
      listar.mockResolvedValue({ itens: [PRATO], total: 1 });
      await userEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }));
      expect(await screen.findByText('Produto excluído.')).toBeInTheDocument();
      expect(excluir).toHaveBeenCalledWith('p1');
      await waitFor(() => expect(screen.queryByText('Copo descartável')).not.toBeInTheDocument());
    });

    it('cancelar não exclui', async () => {
      abrir();
      const excluir = vi.spyOn(produtosService, 'excluir');
      await userEvent.click(await screen.findByRole('button', { name: 'Excluir Prato' }));
      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(excluir).not.toHaveBeenCalled();
      expect(screen.getByText('Prato')).toBeInTheDocument();
    });

    it('falha do servidor vira aviso e mantém o produto', async () => {
      abrir();
      vi.spyOn(produtosService, 'excluir').mockRejectedValue(
        new ErroApi('Produto não encontrado.', { status: 404 }),
      );
      await userEvent.click(await screen.findByRole('button', { name: 'Excluir Prato' }));
      const dialogo = screen.getByRole('dialog');
      await userEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }));
      expect(await screen.findByText('Produto não encontrado.')).toBeInTheDocument();
      expect(screen.getByText('Prato')).toBeInTheDocument();
    });
  });
});
