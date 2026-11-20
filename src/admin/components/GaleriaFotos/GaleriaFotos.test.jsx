import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../../shared/services/api.js';
import { logarComoAdmin, renderizarAdmin } from '../../../test/renderizarAdmin.jsx';
import { categoriasService } from '../../services/categoriasService.js';
import { fotosService } from '../../services/fotosService.js';
import { produtosService } from '../../services/produtosService.js';

const { comprimir } = vi.hoisted(() => ({ comprimir: vi.fn() }));
vi.mock('../../utils/comprimirImagem.js', async (importar) => ({
  ...(await importar()),
  comprimirImagem: comprimir,
}));

const ID = '33333333-3333-4333-8333-333333333333';
const foto = (n) => ({ id: `f${n}`, ordem: n, url: `http://x/${n}.webp` });
const VARIACAO = {
  id: '11111111-1111-4111-8111-111111111111',
  nome_tamanho: 'M',
  ativo: true,
  vende_unidade: true,
  preco_unidade_centavos: 100,
  vende_fardo: false,
  qtd_por_fardo: null,
  preco_fardo_centavos: null,
};
const arquivo = (nome) => new File(['x'], nome, { type: 'image/png' });

async function abrir(fotos = []) {
  logarComoAdmin();
  vi.spyOn(categoriasService, 'listar').mockResolvedValue([
    { id: 'c1', nome: 'Copos', ativo: true },
  ]);
  vi.spyOn(produtosService, 'obter').mockResolvedValue({
    id: ID,
    categoria_id: 'c1',
    nome: 'Copo',
    descricao: '',
    ativo: true,
    fotos,
    variacoes: [VARIACAO],
  });
  renderizarAdmin(`/produtos/${ID}`);
  await screen.findByDisplayValue('Copo');
}

const seletor = () => screen.getByLabelText(/Toque aqui para escolher as fotos/);

describe('GaleriaFotos', () => {
  beforeEach(() => {
    comprimir.mockReset().mockResolvedValue(new Blob(['w'], { type: 'image/webp' }));
  });

  it('comprime, envia e mostra a foto; a primeira recebe o selo "Capa"', async () => {
    await abrir();
    const enviar = vi
      .spyOn(fotosService, 'enviar')
      .mockResolvedValueOnce(foto(1))
      .mockResolvedValueOnce(foto(2));
    await userEvent.upload(seletor(), [arquivo('a.png'), arquivo('b.png')]);
    expect(await screen.findByAltText('Foto 2')).toBeInTheDocument();
    expect(enviar).toHaveBeenCalledTimes(2);
    expect(enviar).toHaveBeenCalledWith(ID, expect.any(Blob));
    expect(screen.getAllByText('Capa')).toHaveLength(1);
    expect(
      screen.getByText('2 de 10 fotos. A primeira é a capa, que aparece na loja.'),
    ).toBeInTheDocument();
  });

  it('mostra "Comprimindo…" e depois "Enviando…" enquanto trabalha', async () => {
    await abrir();
    let terminarCompressao;
    let terminarEnvio;
    comprimir.mockReturnValue(new Promise((r) => (terminarCompressao = r)));
    vi.spyOn(fotosService, 'enviar').mockReturnValue(new Promise((r) => (terminarEnvio = r)));
    await userEvent.upload(seletor(), arquivo('a.png'));
    expect(await screen.findByText('Comprimindo…')).toBeInTheDocument();
    terminarCompressao(new Blob(['w'], { type: 'image/webp' }));
    expect(await screen.findByText('Enviando…')).toBeInTheDocument();
    terminarEnvio(foto(1));
    expect(await screen.findByAltText('Foto 1')).toBeInTheDocument();
  });

  it('erro de envio aparece na foto, com opção de tentar de novo', async () => {
    await abrir();
    const enviar = vi
      .spyOn(fotosService, 'enviar')
      .mockRejectedValueOnce(new ErroApi('A imagem deve ter no máximo 5 MB.', { status: 400 }))
      .mockResolvedValueOnce(foto(1));
    await userEvent.upload(seletor(), arquivo('grande.png'));
    expect(await screen.findByText('Erro')).toBeInTheDocument();
    expect(screen.getByText('A imagem deve ter no máximo 5 MB.')).toBeInTheDocument();
    expect(screen.getByText('grande.png')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByAltText('Foto 1')).toBeInTheDocument();
    expect(enviar).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Erro')).not.toBeInTheDocument();
  });

  it('arquivo que não é imagem falha na compressão e não chega ao servidor', async () => {
    await abrir();
    comprimir.mockRejectedValue(new Error('Este arquivo não é uma imagem.'));
    const enviar = vi.spyOn(fotosService, 'enviar');
    await userEvent.upload(seletor(), new File(['x'], 'a.png', { type: 'image/png' }));
    expect(await screen.findByText('Este arquivo não é uma imagem.')).toBeInTheDocument();
    expect(enviar).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(screen.queryByText('Erro')).not.toBeInTheDocument();
  });

  it('respeita o limite de 10 fotos: ignora as que não cabem e avisa', async () => {
    await abrir(Array.from({ length: 9 }, (_, i) => foto(i + 1)));
    const enviar = vi.spyOn(fotosService, 'enviar').mockResolvedValue(foto(10));
    await userEvent.upload(seletor(), [arquivo('a.png'), arquivo('b.png'), arquivo('c.png')]);
    expect(await screen.findByAltText('Foto 10')).toBeInTheDocument();
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toHaveTextContent('no máximo 10 fotos');
  });

  it('com 10 fotos, não envia nada e explica', async () => {
    await abrir(Array.from({ length: 10 }, (_, i) => foto(i + 1)));
    const enviar = vi.spyOn(fotosService, 'enviar');
    await userEvent.upload(seletor(), arquivo('a.png'));
    expect(screen.getByText(/já tem 10 fotos/)).toBeInTheDocument();
    expect(enviar).not.toHaveBeenCalled();
  });

  it('aceita arrastar e soltar', async () => {
    await abrir();
    vi.spyOn(fotosService, 'enviar').mockResolvedValue(foto(1));
    const zona = seletor().closest('label');
    const soltar = new Event('drop', { bubbles: true, cancelable: true });
    soltar.dataTransfer = { files: [arquivo('a.png')] };
    zona.dispatchEvent(soltar);
    expect(await screen.findByAltText('Foto 1')).toBeInTheDocument();
  });

  it('remover pede confirmação e apaga a foto', async () => {
    await abrir([foto(1), foto(2)]);
    const remover = vi.spyOn(fotosService, 'remover').mockResolvedValue({ id: 'f2' });
    await userEvent.click(screen.getByRole('button', { name: 'Remover foto 2' }));
    expect(remover).not.toHaveBeenCalled();
    const dialogo = screen.getByRole('dialog', { name: 'Remover esta foto?' });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Remover' }));
    await waitFor(() => expect(screen.queryByAltText('Foto 2')).not.toBeInTheDocument());
    expect(remover).toHaveBeenCalledWith('f2');
  });

  it('reordenar manda a nova ordem e passa a capa para a outra foto', async () => {
    await abrir([foto(1), foto(2)]);
    const reordenar = vi
      .spyOn(fotosService, 'reordenar')
      .mockResolvedValue([foto(2), foto(1)].map((f, i) => ({ ...f, ordem: i + 1 })));
    await userEvent.click(screen.getByRole('button', { name: 'Mover foto 2 para cima' }));
    expect(reordenar).toHaveBeenCalledWith(ID, ['f2', 'f1']);
    await waitFor(() =>
      expect(screen.getAllByRole('img', { name: /Foto/ })[0]).toHaveAttribute(
        'src',
        'http://x/2.webp',
      ),
    );
  });

  it('um arquivo com falha não trava os seguintes na fila', async () => {
    await abrir();
    comprimir
      .mockRejectedValueOnce(new Error('Não foi possível ler esta imagem.'))
      .mockResolvedValue(new Blob(['w'], { type: 'image/webp' }));
    vi.spyOn(fotosService, 'enviar').mockResolvedValue(foto(1));
    await userEvent.upload(seletor(), [arquivo('ruim.png'), arquivo('boa.png')]);
    expect(await screen.findByAltText('Foto 1')).toBeInTheDocument();
    expect(screen.getByText('Não foi possível ler esta imagem.')).toBeInTheDocument();
  });

  it('tentar de novo respeita o limite de 10 fotos', async () => {
    await abrir(Array.from({ length: 9 }, (_, i) => foto(i + 1)));
    const enviar = vi
      .spyOn(fotosService, 'enviar')
      .mockRejectedValueOnce(new ErroApi('Falhou.', { status: 400 }))
      .mockResolvedValueOnce(foto(10));
    await userEvent.upload(seletor(), arquivo('a.png'));
    await screen.findByText('Falhou.');
    await userEvent.upload(seletor(), arquivo('b.png'));
    await screen.findByAltText('Foto 10');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(screen.getByText(/já tem 10 fotos/)).toBeInTheDocument();
    expect(enviar).toHaveBeenCalledTimes(2);
  });
});
