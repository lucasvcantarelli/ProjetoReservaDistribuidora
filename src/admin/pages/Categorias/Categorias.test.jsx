import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../../shared/services/api.js';
import { logarComoAdmin, renderizarAdmin } from '../../../test/renderizarAdmin.jsx';
import { sessaoAdmin } from '../../services/apiAdmin.js';
import { categoriasService } from '../../services/categoriasService.js';

const COPOS = { id: 'c-1', nome: 'Copos', slug: 'copos', ordem: 0, ativo: true };
const PRATOS = { id: 'c-2', nome: 'Pratos', slug: 'pratos', ordem: 1, ativo: false };
const TAMPAS = { id: 'c-3', nome: 'Tampas', slug: 'tampas', ordem: 2, ativo: true };

function abrirCategorias(lista = [COPOS, PRATOS, TAMPAS]) {
  logarComoAdmin();
  vi.spyOn(categoriasService, 'listar').mockResolvedValue(lista);
  return renderizarAdmin('/categorias');
}

describe('Categorias', () => {
  it('lista nome, slug e status (Ativa/Inativa)', async () => {
    abrirCategorias();
    const linhaPratos = (await screen.findByText('Pratos')).closest('tr');
    expect(within(linhaPratos).getByText('pratos')).toBeInTheDocument();
    expect(within(linhaPratos).getByText('Inativa')).toBeInTheDocument();
    expect(within(screen.getByText('Copos').closest('tr')).getByText('Ativa')).toBeInTheDocument();
  });

  it('sem categorias mostra o estado vazio', async () => {
    abrirCategorias([]);
    expect(await screen.findByText('Nenhuma categoria ainda.')).toBeInTheDocument();
  });

  it('criar categoria: aparece na lista e mostra o toast "Categoria criada."', async () => {
    abrirCategorias([COPOS]);
    const criar = vi.spyOn(categoriasService, 'criar').mockResolvedValue({
      id: 'c-9',
      nome: 'Guardanapos',
      slug: 'guardanapos',
      ordem: 1,
      ativo: true,
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Nova categoria' }));
    const dialogo = screen.getByRole('dialog', { name: 'Nova categoria' });
    expect(within(dialogo).queryByRole('checkbox')).not.toBeInTheDocument();
    await userEvent.type(within(dialogo).getByLabelText('Nome'), ' Guardanapos ');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Categoria criada.')).toBeInTheDocument();
    expect(criar).toHaveBeenCalledWith({ nome: 'Guardanapos' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Guardanapos')).toBeInTheDocument();
  });

  it('erro de validação do servidor aparece no formulário e o modal continua aberto', async () => {
    abrirCategorias([]);
    vi.spyOn(categoriasService, 'criar').mockRejectedValue(
      new ErroApi('Informe o nome.', { status: 400, campos: { nome: 'Obrigatório.' } }),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Nova categoria' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Obrigatório.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('editar: abre com os valores, salva nome e status e mostra "Categoria atualizada."', async () => {
    abrirCategorias();
    const editar = vi
      .spyOn(categoriasService, 'editar')
      .mockResolvedValue({ ...PRATOS, nome: 'Pratos fundos', ativo: true });
    await userEvent.click(await screen.findByRole('button', { name: 'Editar Pratos' }));
    const dialogo = screen.getByRole('dialog', { name: 'Editar categoria' });
    const nome = within(dialogo).getByLabelText('Nome');
    expect(nome).toHaveValue('Pratos');
    expect(within(dialogo).getByRole('checkbox')).not.toBeChecked();
    await userEvent.clear(nome);
    await userEvent.type(nome, 'Pratos fundos');
    await userEvent.click(within(dialogo).getByRole('checkbox'));
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Categoria atualizada.')).toBeInTheDocument();
    expect(editar).toHaveBeenCalledWith('c-2', { nome: 'Pratos fundos', ativo: true });
    expect(screen.getByText('Pratos fundos')).toBeInTheDocument();
  });

  describe('excluir', () => {
    it('pede confirmação e, confirmado, remove e mostra "Categoria excluída."', async () => {
      abrirCategorias();
      const excluir = vi.spyOn(categoriasService, 'excluir').mockResolvedValue({ id: 'c-1' });
      await userEvent.click(await screen.findByRole('button', { name: 'Excluir Copos' }));
      expect(excluir).not.toHaveBeenCalled();
      const dialogo = screen.getByRole('dialog', { name: 'Excluir categoria?' });
      await userEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }));
      expect(await screen.findByText('Categoria excluída.')).toBeInTheDocument();
      expect(excluir).toHaveBeenCalledWith('c-1');
      expect(screen.queryByText('Copos')).not.toBeInTheDocument();
    });

    it('cancelar na confirmação não exclui', async () => {
      abrirCategorias();
      const excluir = vi.spyOn(categoriasService, 'excluir');
      await userEvent.click(await screen.findByRole('button', { name: 'Excluir Copos' }));
      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(excluir).not.toHaveBeenCalled();
      expect(screen.getByText('Copos')).toBeInTheDocument();
    });

    it('409 mostra a mensagem do servidor e mantém a categoria', async () => {
      abrirCategorias();
      vi.spyOn(categoriasService, 'excluir').mockRejectedValue(
        new ErroApi('Esta categoria tem produtos. Mova ou exclua os produtos antes.', {
          status: 409,
        }),
      );
      await userEvent.click(await screen.findByRole('button', { name: 'Excluir Copos' }));
      const dialogo = screen.getByRole('dialog', { name: 'Excluir categoria?' });
      await userEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }));
      expect(
        await screen.findByText('Esta categoria tem produtos. Mova ou exclua os produtos antes.'),
      ).toBeInTheDocument();
      expect(screen.getByText('Copos')).toBeInTheDocument();
    });
  });

  describe('ordem', () => {
    it('desabilita "subir" na primeira e "descer" na última', async () => {
      abrirCategorias();
      expect(await screen.findByRole('button', { name: 'Mover Copos para cima' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      expect(screen.getByRole('button', { name: 'Mover Tampas para baixo' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      expect(screen.getByRole('button', { name: 'Mover Pratos para cima' })).not.toHaveAttribute(
        'aria-disabled',
      );
    });

    it('mover para baixo chama reordenar com a nova ordem dos ids e usa a lista devolvida', async () => {
      abrirCategorias();
      const reordenar = vi
        .spyOn(categoriasService, 'reordenar')
        .mockResolvedValue([PRATOS, COPOS, TAMPAS]);
      await userEvent.click(await screen.findByRole('button', { name: 'Mover Copos para baixo' }));
      await vi.waitFor(() => expect(reordenar).toHaveBeenCalledWith(['c-2', 'c-1', 'c-3']));
      await vi.waitFor(() => {
        const nomes = screen
          .getAllByRole('row')
          .slice(1)
          .map((l) => within(l).getAllByRole('cell')[1].textContent);
        expect(nomes).toEqual(['Pratos', 'Copos', 'Tampas']);
      });
    });

    it('depois de mover, o foco fica na mesma seta da categoria e o leitor de tela é avisado', async () => {
      abrirCategorias();
      vi.spyOn(categoriasService, 'reordenar').mockResolvedValue([COPOS, TAMPAS, PRATOS]);
      const seta = await screen.findByRole('button', { name: 'Mover Tampas para cima' });
      await userEvent.click(seta);
      await vi.waitFor(() =>
        expect(screen.getByRole('button', { name: 'Mover Tampas para cima' })).toHaveFocus(),
      );
      expect(screen.getByText('Tampas movida para a posição 2.')).toBeInTheDocument();
    });

    it('ao chegar ao topo o foco vai para a seta oposta (a de cima fica sem ação)', async () => {
      abrirCategorias();
      vi.spyOn(categoriasService, 'reordenar').mockResolvedValue([PRATOS, COPOS, TAMPAS]);
      await userEvent.click(await screen.findByRole('button', { name: 'Mover Pratos para cima' }));
      await vi.waitFor(() =>
        expect(screen.getByRole('button', { name: 'Mover Pratos para baixo' })).toHaveFocus(),
      );
      expect(screen.getByText('Pratos movida para a posição 1.')).toBeInTheDocument();
    });

    it('clique numa seta sem ação (aria-disabled) não chama reordenar', async () => {
      abrirCategorias();
      const reordenar = vi.spyOn(categoriasService, 'reordenar');
      await userEvent.click(await screen.findByRole('button', { name: 'Mover Copos para cima' }));
      expect(reordenar).not.toHaveBeenCalled();
    });

    it('mover para cima troca com a anterior', async () => {
      abrirCategorias();
      const reordenar = vi
        .spyOn(categoriasService, 'reordenar')
        .mockResolvedValue([COPOS, TAMPAS, PRATOS]);
      await userEvent.click(await screen.findByRole('button', { name: 'Mover Tampas para cima' }));
      await vi.waitFor(() => expect(reordenar).toHaveBeenCalledWith(['c-1', 'c-3', 'c-2']));
    });
  });

  it('sessão vencida (401) leva ao login com voltar=/categorias', async () => {
    logarComoAdmin();
    vi.spyOn(categoriasService, 'listar').mockRejectedValue(
      new ErroApi('Sessão expirada. Faça login novamente.', { status: 401 }),
    );
    const roteador = renderizarAdmin('/categorias');
    await vi.waitFor(() => expect(roteador.state.location.pathname).toBe('/entrar'));
    expect(roteador.state.location.search).toBe('?voltar=/categorias');
    expect(sessaoAdmin.obter()).toBeNull();
  });

  it('falha ao carregar mostra o erro e permite tentar de novo', async () => {
    logarComoAdmin();
    const listar = vi
      .spyOn(categoriasService, 'listar')
      .mockRejectedValueOnce(new ErroApi('Falha no servidor.', { status: 500 }))
      .mockResolvedValue([COPOS]);
    renderizarAdmin('/categorias');
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha no servidor.');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Copos')).toBeInTheDocument();
    expect(listar).toHaveBeenCalledTimes(2);
  });
});
