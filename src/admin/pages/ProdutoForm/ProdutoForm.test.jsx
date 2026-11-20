import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../../shared/services/api.js';
import { logarComoAdmin, renderizarAdmin } from '../../../test/renderizarAdmin.jsx';
import { categoriasService } from '../../services/categoriasService.js';
import { produtosService } from '../../services/produtosService.js';

const CATEGORIA = { id: '8f14e45f-ceea-467a-9575-9f7a8f2b1c11', nome: 'Copos', ativo: true };
const VARIACAO_P = {
  id: '11111111-1111-4111-8111-111111111111',
  nome_tamanho: '200 ml',
  ordem: 0,
  ativo: true,
  vende_unidade: true,
  preco_unidade_centavos: 150,
  vende_fardo: false,
  qtd_por_fardo: null,
  preco_fardo_centavos: null,
};
const VARIACAO_G = {
  ...VARIACAO_P,
  id: '22222222-2222-4222-8222-222222222222',
  nome_tamanho: '1 litro',
  ordem: 1,
  vende_fardo: true,
  qtd_por_fardo: 50,
  preco_fardo_centavos: 5000,
};
const PRODUTO = {
  id: '33333333-3333-4333-8333-333333333333',
  categoria_id: CATEGORIA.id,
  nome: 'Copo descartável',
  descricao: 'Copo resistente.',
  ativo: true,
  fotos: [],
  variacoes: [VARIACAO_P, VARIACAO_G],
};

function abrir(url) {
  logarComoAdmin();
  vi.spyOn(categoriasService, 'listar').mockResolvedValue([CATEGORIA]);
  vi.spyOn(produtosService, 'listar').mockResolvedValue({ itens: [], total: 0 });
  return renderizarAdmin(url);
}

async function abrirEdicao() {
  vi.spyOn(produtosService, 'obter').mockResolvedValue(PRODUTO);
  const roteador = abrir(`/produtos/${PRODUTO.id}`);
  await screen.findByDisplayValue('Copo descartável');
  return roteador;
}

async function preencherProdutoNovo() {
  await userEvent.type(await screen.findByLabelText('Nome do produto'), 'Prato');
  await userEvent.selectOptions(screen.getByLabelText('Categoria'), CATEGORIA.id);
  await userEvent.type(screen.getByLabelText('Tamanho'), '20 cm');
  await userEvent.type(screen.getByLabelText('Preço da unidade'), '1,5');
}

describe('ProdutoForm', () => {
  it('mostra as três seções com títulos claros', async () => {
    abrir('/produtos/novo');
    await screen.findByLabelText('Nome do produto');
    expect(screen.getByRole('heading', { name: /Informações/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Tamanhos e preços/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Fotos/ })).toBeInTheDocument();
    expect(screen.getByText(/Primeiro salve o produto/)).toBeInTheDocument();
  });

  it('salvar sem preencher mostra os erros e não chama o servidor', async () => {
    abrir('/produtos/novo');
    const criar = vi.spyOn(produtosService, 'criar');
    await userEvent.click(await screen.findByRole('button', { name: 'Salvar' }));
    expect(screen.getAllByText('Campo obrigatório.')).toHaveLength(2); // nome e tamanho
    expect(screen.getByText('Escolha uma categoria.')).toBeInTheDocument();
    expect(screen.getAllByText('Informe um preço válido.').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Nome do produto')).toHaveFocus();
    expect(criar).not.toHaveBeenCalled();
  });

  it('salvar sem nenhum tamanho mostra erro', async () => {
    abrir('/produtos/novo');
    const criar = vi.spyOn(produtosService, 'criar');
    await userEvent.click(await screen.findByRole('button', { name: 'Remover tamanho 1' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByText('Adicione ao menos um tamanho.')).toBeInTheDocument();
    expect(criar).not.toHaveBeenCalled();
  });

  it('desmarcar unidade e fardo pede uma forma de venda', async () => {
    abrir('/produtos/novo');
    await userEvent.click(await screen.findByLabelText('Vende por unidade'));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByText('Escolha ao menos uma forma de venda.')).toBeInTheDocument();
  });

  it('criar: envia preços em centavos, avisa e abre o produto para adicionar fotos', async () => {
    const criar = vi.spyOn(produtosService, 'criar').mockResolvedValue(PRODUTO);
    vi.spyOn(produtosService, 'obter').mockResolvedValue(PRODUTO);
    const roteador = abrir('/produtos/novo');
    await preencherProdutoNovo();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(criar).toHaveBeenCalledWith({
      produto: { categoria_id: CATEGORIA.id, nome: 'Prato', descricao: '', ativo: true },
      variacoes: [
        {
          id: null,
          ativo: true,
          nome_tamanho: '20 cm',
          vende_unidade: true,
          preco_unidade_centavos: 150,
          vende_fardo: false,
          qtd_por_fardo: null,
          preco_fardo_centavos: null,
        },
      ],
    });
    expect(await screen.findByText('Produto criado. Agora adicione as fotos.')).toBeInTheDocument();
    expect(roteador.state.location.pathname).toBe(`/produtos/${PRODUTO.id}`);
    expect(await screen.findByLabelText(/Toque aqui para escolher as fotos/)).toBeInTheDocument();
  });

  it('erro do servidor aparece no campo e no aviso geral', async () => {
    vi.spyOn(produtosService, 'criar').mockRejectedValue(
      new ErroApi('Confira os campos informados.', {
        status: 400,
        campos: { categoria_id: 'Escolha uma categoria existente.' },
      }),
    );
    abrir('/produtos/novo');
    await preencherProdutoNovo();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Escolha uma categoria existente.')).toBeInTheDocument();
    expect(screen.getByText('Confira os campos informados.')).toBeInTheDocument();
  });

  it('descrição mostra o contador de caracteres', async () => {
    abrir('/produtos/novo');
    await userEvent.type(await screen.findByLabelText(/Descrição/), 'Boa');
    expect(screen.getByText('3 de 2000 caracteres')).toBeInTheDocument();
  });

  describe('edição', () => {
    it('carrega os dados do produto e os preços em reais', async () => {
      await abrirEdicao();
      expect(screen.getByLabelText('Categoria')).toHaveValue(CATEGORIA.id);
      expect(screen.getAllByLabelText('Preço da unidade')[0]).toHaveValue('1,50');
      expect(screen.getByLabelText('Preço do fardo')).toHaveValue('50,00');
      expect(screen.getByText('R$ 1,00 por unidade no fardo')).toBeInTheDocument();
    });

    it('remover um tamanho (com confirmação) envia a lista sem ele', async () => {
      const editar = vi.spyOn(produtosService, 'editar').mockResolvedValue({
        ...PRODUTO,
        variacoes: [VARIACAO_P],
      });
      await abrirEdicao();
      await userEvent.click(screen.getByRole('button', { name: 'Remover 1 litro' }));
      const dialogo = screen.getByRole('dialog', { name: 'Remover 1 litro?' });
      await userEvent.click(within(dialogo).getByRole('button', { name: 'Remover' }));
      await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
      expect(editar).toHaveBeenCalledTimes(1);
      const [id, corpo] = editar.mock.calls[0];
      expect(id).toBe(PRODUTO.id);
      expect(corpo.variacoes).toHaveLength(1);
      expect(corpo.variacoes[0]).toMatchObject({ id: VARIACAO_P.id, nome_tamanho: '200 ml' });
      expect(await screen.findByText('Produto atualizado.')).toBeInTheDocument();
    });

    it('cancelar a remoção mantém o tamanho', async () => {
      await abrirEdicao();
      await userEvent.click(screen.getByRole('button', { name: 'Remover 1 litro' }));
      const dialogo = screen.getByRole('dialog', { name: 'Remover 1 litro?' });
      await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
      expect(screen.getByDisplayValue('1 litro')).toBeInTheDocument();
    });
  });

  describe('alterações não salvas', () => {
    it('sem alterações, sair não pergunta nada', async () => {
      const roteador = await abrirEdicao();
      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(roteador.state.location.pathname).toBe('/produtos');
    });

    it('com alterações, pergunta; "Cancelar" fica na página e "Sair sem salvar" sai', async () => {
      const roteador = await abrirEdicao();
      await userEvent.type(screen.getByLabelText('Nome do produto'), ' novo');
      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      const dialogo = await screen.findByRole('dialog', { name: 'Sair sem salvar?' });
      await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
      expect(roteador.state.location.pathname).toBe(`/produtos/${PRODUTO.id}`);
      expect(screen.getByDisplayValue('Copo descartável novo')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      const segundo = await screen.findByRole('dialog', { name: 'Sair sem salvar?' });
      await userEvent.click(within(segundo).getByRole('button', { name: 'Sair sem salvar' }));
      expect(await screen.findByRole('heading', { name: 'Produtos' })).toBeInTheDocument();
      expect(roteador.state.location.pathname).toBe('/produtos');
    });

    it('o navegador avisa ao fechar a aba só quando há alterações', async () => {
      await abrirEdicao();
      const limpo = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(limpo);
      expect(limpo.defaultPrevented).toBe(false);

      await userEvent.type(screen.getByLabelText('Nome do produto'), 'x');
      const sujo = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(sujo);
      expect(sujo.defaultPrevented).toBe(true);
    });

    it('depois de salvar não pergunta mais', async () => {
      vi.spyOn(produtosService, 'editar').mockResolvedValue({ ...PRODUTO, nome: 'Copo novo' });
      const roteador = await abrirEdicao();
      const nome = screen.getByLabelText('Nome do produto');
      await userEvent.clear(nome);
      await userEvent.type(nome, 'Copo novo');
      await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
      await screen.findByText('Produto atualizado.');
      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(screen.queryByRole('dialog', { name: 'Sair sem salvar?' })).not.toBeInTheDocument();
      expect(roteador.state.location.pathname).toBe('/produtos');
    });
  });
});
