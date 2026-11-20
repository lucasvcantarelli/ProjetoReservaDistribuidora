import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderizarLoja } from '../../../test/renderizarLoja.jsx';
import { ErroApi } from '../../../shared/services/api.js';
import { catalogoService } from '../../services/catalogoService.js';
import { carrinhoService } from '../../services/carrinhoService.js';
import { pedidoService } from '../../services/pedidoService.js';

const BOTAO_PREPARAR = 'Preparar pedido';
const CONTATO = {
  Nome: 'Ana Souza',
  'Telefone com DDD': '11999998888',
  CEP: '01310100',
  Rua: 'Avenida Paulista',
  Número: '1000',
  Bairro: 'Bela Vista',
  Cidade: 'São Paulo',
};
const LINK = 'https://wa.me/5511999999999?text=oi';

const ITEM = {
  variacao_id: 'v1',
  forma: 'unidade',
  quantidade: 2,
  produto_id: 'p1',
  produto_nome: 'Copo descartável',
  nome_tamanho: 'M',
  preco_centavos: 100,
  foto_url: null,
};
const ITEM_REVISADO = {
  variacao_id: 'v1',
  forma: 'unidade',
  quantidade: 2,
  produto_nome: 'Copo descartável',
  nome_tamanho: 'M',
  preco_centavos: 150,
  subtotal_centavos: 300,
};
const REVISAO_OK = { itens: [ITEM_REVISADO], divergencias: [], total_centavos: 300 };
const DIVERGENCIA_PRECO = {
  variacao_id: 'v1',
  forma: 'unidade',
  tipo: 'preco_mudou',
  preco_anterior_centavos: 100,
  preco_atual_centavos: 150,
};

function prepararCliente(itens = [ITEM]) {
  itens.forEach((item) => carrinhoService.adicionar(item));
}

async function preencherContato() {
  for (const [rotulo, texto] of Object.entries(CONTATO)) {
    await userEvent.type(screen.getByLabelText(rotulo), texto);
  }
  await userEvent.selectOptions(screen.getByLabelText('UF'), 'SP');
}

// Preenche a identificação de pessoa física e toca em "Preparar pedido".
async function preencherEPreparar() {
  await screen.findByRole('button', { name: BOTAO_PREPARAR });
  await preencherContato();
  await userEvent.click(screen.getByRole('button', { name: BOTAO_PREPARAR }));
}

async function abrirFinalizar() {
  const roteador = renderizarLoja('/finalizar');
  await screen.findByRole('heading', { name: 'Finalizar pedido' });
  return roteador;
}

describe('Finalizar', () => {
  it('carrinho vazio redireciona para /carrinho', async () => {
    const roteador = renderizarLoja('/finalizar');
    await vi.waitFor(() => expect(roteador.state.location.pathname).toBe('/carrinho'));
  });

  it('mostra o resumo do servidor, envia o carrinho e os preços vistos', async () => {
    prepararCliente();
    const revisar = vi.spyOn(pedidoService, 'revisar').mockResolvedValue(REVISAO_OK);
    await abrirFinalizar();
    expect(await screen.findByText('R$ 1,50', { exact: false })).toBeInTheDocument();
    expect(screen.getAllByText('R$ 3,00')).toHaveLength(2);
    expect(revisar).toHaveBeenCalledTimes(1);
    expect(revisar.mock.calls[0][0][0]).toMatchObject({ variacao_id: 'v1', quantidade: 2 });
    expect(screen.getByRole('button', { name: BOTAO_PREPARAR })).toBeEnabled();
  });

  it('divergência de preço mostra os dois valores, bloqueia o envio e é resolvida ao atualizar', async () => {
    prepararCliente();
    const revisar = vi
      .spyOn(pedidoService, 'revisar')
      .mockResolvedValueOnce({ ...REVISAO_OK, divergencias: [DIVERGENCIA_PRECO] })
      .mockResolvedValueOnce(REVISAO_OK);
    await abrirFinalizar();
    expect(await screen.findByText('Preço mudou de R$ 1,00 para R$ 1,50')).toBeInTheDocument();
    const enviar = screen.getByRole('button', { name: BOTAO_PREPARAR });
    expect(enviar).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Atualizar carrinho e continuar' }));
    await vi.waitFor(() => expect(enviar).toBeEnabled());
    expect(revisar).toHaveBeenCalledTimes(2);
    expect(carrinhoService.ler()[0].preco_centavos).toBe(150);
    expect(screen.queryByText(/Preço mudou/)).not.toBeInTheDocument();
  });

  it('item indisponível é explicado e removido do carrinho ao atualizar', async () => {
    prepararCliente([ITEM, { ...ITEM, variacao_id: 'v2', produto_nome: 'Prato' }]);
    vi.spyOn(pedidoService, 'revisar')
      .mockResolvedValueOnce({
        itens: [ITEM_REVISADO],
        divergencias: [{ variacao_id: 'v2', forma: 'unidade', tipo: 'indisponivel' }],
        total_centavos: 300,
      })
      .mockResolvedValueOnce(REVISAO_OK);
    await abrirFinalizar();
    expect(await screen.findByText('Item indisponível — será removido')).toBeInTheDocument();
    expect(screen.getByText('Prato (M)')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Atualizar carrinho e continuar' }));
    await vi.waitFor(() => expect(carrinhoService.ler()).toHaveLength(1));
    expect(carrinhoService.ler()[0].variacao_id).toBe('v1');
  });

  it('observação tem contador e limite de 500 caracteres', async () => {
    prepararCliente();
    vi.spyOn(pedidoService, 'revisar').mockResolvedValue(REVISAO_OK);
    await abrirFinalizar();
    const campo = await screen.findByLabelText('Observação (opcional)');
    expect(campo).toHaveAttribute('maxlength', '500');
    await userEvent.type(campo, 'Entregar cedo');
    expect(screen.getByText('13/500 caracteres')).toBeInTheDocument();
  });

  it('depois de preparar, mostra "Pedido pronto!" com o link do WhatsApp e não abre nada sozinho', async () => {
    prepararCliente();
    vi.spyOn(pedidoService, 'revisar').mockResolvedValue(REVISAO_OK);
    const enviar = vi.spyOn(pedidoService, 'enviar').mockResolvedValue({ link: LINK });
    const abrir = vi.spyOn(window, 'open');
    await abrirFinalizar();
    await userEvent.type(await screen.findByLabelText('Observação (opcional)'), 'Cedo');
    await preencherContato();
    await userEvent.click(screen.getByRole('button', { name: BOTAO_PREPARAR }));
    const link = await screen.findByRole('link', { name: 'Abrir WhatsApp' });
    expect(link).toHaveAttribute('href', LINK);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText('Pedido pronto!')).toBeInTheDocument();
    expect(enviar.mock.calls[0][1]).toBe('Cedo');
    expect(enviar.mock.calls[0][2]).toMatchObject({
      tipo_pessoa: 'PF',
      nome: 'Ana Souza',
      telefone: '11999998888',
      cep: '01310100',
      uf: 'SP',
    });
    for (const campo of ['cpf', 'cpf_cnpj', 'email', 'razao_social']) {
      expect(enviar.mock.calls[0][2]).not.toHaveProperty(campo);
    }
    expect(abrir).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(pedidoService.confirmacaoPendente()).toBe(false);
  });

  it.each(['javascript:alert(1)', 'https://mal.com/x', undefined])(
    'link do servidor fora de https://wa.me/ (%s) mostra o aviso e não renderiza o botão',
    async (linkRuim) => {
      prepararCliente();
      vi.spyOn(pedidoService, 'revisar').mockResolvedValue(REVISAO_OK);
      vi.spyOn(pedidoService, 'enviar').mockResolvedValue({ link: linkRuim });
      await abrirFinalizar();
      await preencherEPreparar();
      expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível preparar');
      expect(screen.queryByRole('link', { name: 'Abrir WhatsApp' })).not.toBeInTheDocument();
    },
  );

  it('tocar em "Abrir WhatsApp" marca a confirmação pendente e abre o modal', async () => {
    prepararCliente();
    vi.spyOn(pedidoService, 'revisar').mockResolvedValue(REVISAO_OK);
    vi.spyOn(pedidoService, 'enviar').mockResolvedValue({ link: LINK });
    await abrirFinalizar();
    await preencherEPreparar();
    await userEvent.click(await screen.findByRole('link', { name: 'Abrir WhatsApp' }));
    expect(
      await screen.findByRole('dialog', { name: 'Seu pedido foi enviado pelo WhatsApp?' }),
    ).toBeInTheDocument();
    expect(pedidoService.confirmacaoPendente()).toBe(true);
  });

  it('ao reabrir /finalizar com a confirmação pendente, o modal aparece de novo', async () => {
    prepararCliente();
    pedidoService.marcarConfirmacaoPendente();
    vi.spyOn(pedidoService, 'revisar').mockResolvedValue(REVISAO_OK);
    await abrirFinalizar();
    expect(
      await screen.findByRole('dialog', { name: 'Seu pedido foi enviado pelo WhatsApp?' }),
    ).toBeInTheDocument();
  });

  it('ao voltar para a aba com a confirmação pendente, o modal aparece', async () => {
    prepararCliente();
    vi.spyOn(pedidoService, 'revisar').mockResolvedValue(REVISAO_OK);
    await abrirFinalizar();
    await screen.findByRole('button', { name: BOTAO_PREPARAR });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    pedidoService.marcarConfirmacaoPendente();
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('"Sim, limpar carrinho" limpa carrinho e lembrete, avisa e vai para o início', async () => {
    prepararCliente();
    pedidoService.marcarConfirmacaoPendente();
    vi.spyOn(pedidoService, 'revisar').mockResolvedValue(REVISAO_OK);
    vi.spyOn(catalogoService, 'categorias').mockResolvedValue([]);
    vi.spyOn(catalogoService, 'produtos').mockResolvedValue({ itens: [], total: 0 });
    const roteador = await abrirFinalizar();
    const dialogo = await screen.findByRole('dialog', {
      name: 'Seu pedido foi enviado pelo WhatsApp?',
    });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Sim, limpar carrinho' }));
    await vi.waitFor(() => expect(roteador.state.location.pathname).toBe('/'));
    expect(carrinhoService.ler()).toEqual([]);
    expect(pedidoService.confirmacaoPendente()).toBe(false);
    expect(await screen.findByText('Pedido enviado. Obrigado!')).toBeInTheDocument();
  });

  it('"Não, manter carrinho" fecha o modal, limpa só o lembrete e preserva o carrinho', async () => {
    prepararCliente();
    pedidoService.marcarConfirmacaoPendente();
    vi.spyOn(pedidoService, 'revisar').mockResolvedValue(REVISAO_OK);
    await abrirFinalizar();
    await userEvent.click(await screen.findByRole('button', { name: 'Não, manter carrinho' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(carrinhoService.ler()).toHaveLength(1);
    expect(pedidoService.confirmacaoPendente()).toBe(false);
  });

  it('mudar a observação depois de preparar descarta o link e exige preparar de novo', async () => {
    prepararCliente();
    vi.spyOn(pedidoService, 'revisar').mockResolvedValue(REVISAO_OK);
    vi.spyOn(pedidoService, 'enviar').mockResolvedValue({ link: LINK });
    await abrirFinalizar();
    await preencherEPreparar();
    await screen.findByRole('link', { name: 'Abrir WhatsApp' });
    await userEvent.type(screen.getByLabelText('Observação (opcional)'), 'x');
    expect(screen.queryByRole('link', { name: 'Abrir WhatsApp' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: BOTAO_PREPARAR })).toBeEnabled();
  });

  it('409 ao enviar mostra as novas divergências e bloqueia o envio', async () => {
    prepararCliente();
    vi.spyOn(pedidoService, 'revisar').mockResolvedValue(REVISAO_OK);
    vi.spyOn(pedidoService, 'enviar').mockRejectedValue(
      new ErroApi('Alguns itens mudaram. Revise o carrinho.', {
        status: 409,
        dados: { ...REVISAO_OK, divergencias: [DIVERGENCIA_PRECO] },
      }),
    );
    await abrirFinalizar();
    const botao = await screen.findByRole('button', { name: BOTAO_PREPARAR });
    await preencherContato();
    await userEvent.click(botao);
    expect(await screen.findByText('Preço mudou de R$ 1,00 para R$ 1,50')).toBeInTheDocument();
    expect(botao).toBeDisabled();
  });

  it('503 mostra a mensagem do servidor', async () => {
    prepararCliente();
    vi.spyOn(pedidoService, 'revisar').mockResolvedValue(REVISAO_OK);
    vi.spyOn(pedidoService, 'enviar').mockRejectedValue(
      new ErroApi('A empresa ainda não configurou o WhatsApp.', { status: 503 }),
    );
    await abrirFinalizar();
    await preencherEPreparar();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A empresa ainda não configurou o WhatsApp.',
    );
  });
});
