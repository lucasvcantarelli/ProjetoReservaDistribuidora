import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../../shared/services/api.js';
import { logarComoAdmin, renderizarAdmin } from '../../../test/renderizarAdmin.jsx';
import { configService } from '../../services/configService.js';

const { comprimir } = vi.hoisted(() => ({ comprimir: vi.fn() }));
vi.mock('../../utils/comprimirImagem.js', async (importar) => ({
  ...(await importar()),
  comprimirImagem: comprimir,
}));

const CONFIG = {
  nome: 'Reserva Distribuidora',
  cnpj: null,
  whatsapp: null,
  endereco: null,
  rodape_mensagem: null,
  email_privacidade: null,
  logo_url: null,
};
const SEM_WHATSAPP = 'Sem WhatsApp configurado, os clientes não conseguem enviar pedidos.';
const PREVIA_11 = 'Os pedidos chegarão em: +55 (81) 99999-0000';

async function abrir(config = CONFIG) {
  logarComoAdmin();
  vi.spyOn(configService, 'obter').mockResolvedValue(config);
  const roteador = renderizarAdmin('/configuracoes');
  await screen.findByDisplayValue(config.nome);
  return roteador;
}

const campoWhatsapp = () => screen.getByLabelText('WhatsApp da empresa (com DDD)');
const salvar = () => userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

describe('Configuracoes', () => {
  it('mostra as seções e avisa quando não há WhatsApp configurado', async () => {
    await abrir();
    for (const titulo of ['Dados da empresa', 'WhatsApp dos pedidos', 'Logo']) {
      expect(screen.getByRole('heading', { name: new RegExp(titulo) })).toBeInTheDocument();
    }
    expect(screen.getByText(SEM_WHATSAPP)).toBeInTheDocument();
    expect(screen.queryByText(/Os pedidos chegarão em/)).not.toBeInTheDocument();
    expect(screen.getByText('Sem logo')).toBeInTheDocument();
  });

  it('prévia ao vivo: 11 dígitos, 10 dígitos e número colado com DDI', async () => {
    await abrir();
    await userEvent.type(campoWhatsapp(), '81999990000');
    expect(campoWhatsapp()).toHaveValue('(81) 99999-0000');
    expect(screen.getByText(PREVIA_11)).toBeInTheDocument();
    expect(screen.queryByText(SEM_WHATSAPP)).not.toBeInTheDocument();

    await userEvent.clear(campoWhatsapp());
    await userEvent.type(campoWhatsapp(), '8133334444');
    expect(screen.getByText('Os pedidos chegarão em: +55 (81) 3333-4444')).toBeInTheDocument();

    await userEvent.clear(campoWhatsapp());
    await userEvent.click(campoWhatsapp());
    await userEvent.paste('+55 81 99999-0000');
    expect(campoWhatsapp()).toHaveValue('(81) 99999-0000');
    expect(screen.getByText(PREVIA_11)).toBeInTheDocument();
  });

  it('número incompleto não mostra a prévia nem o link de teste', async () => {
    await abrir();
    await userEvent.type(campoWhatsapp(), '81999');
    expect(screen.queryByText(/Os pedidos chegarão em/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Testar número' })).not.toBeInTheDocument();
    expect(screen.getByText(/Digite o número completo/)).toBeInTheDocument();
  });

  it('"Testar número" abre wa.me só com dígitos e DDI em outra aba, com rel seguro', async () => {
    await abrir();
    await userEvent.type(campoWhatsapp(), '81999990000');
    const link = screen.getByRole('link', { name: 'Testar número' });
    expect(link).toHaveAttribute('href', 'https://wa.me/5581999990000');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('com número salvo mostra a prévia dele; mudar o número avisa que ainda não foi salvo', async () => {
    await abrir({ ...CONFIG, whatsapp: '5581999990000' });
    expect(campoWhatsapp()).toHaveValue('(81) 99999-0000');
    expect(screen.getByText(PREVIA_11)).toBeInTheDocument();
    expect(screen.queryByText(/Ainda não salvo/)).not.toBeInTheDocument();
    await userEvent.clear(campoWhatsapp());
    await userEvent.type(campoWhatsapp(), '11988887777');
    expect(screen.getByText(/Ainda não salvo/)).toBeInTheDocument();
  });

  it('salva WhatsApp (com DDI), CNPJ só dígitos, rodapé e mostra o toast', async () => {
    await abrir();
    const editar = vi
      .spyOn(configService, 'editar')
      .mockResolvedValue({ ...CONFIG, whatsapp: '5581999990000', cnpj: '11222333000181' });
    await userEvent.type(campoWhatsapp(), '81999990000');
    await userEvent.type(screen.getByLabelText('CNPJ (opcional)'), '11222333000181');
    expect(screen.getByLabelText('CNPJ (opcional)')).toHaveValue('11.222.333/0001-81');
    await userEvent.type(
      screen.getByLabelText('Texto de rodapé da mensagem (opcional)'),
      'Obrigado!',
    );
    expect(screen.getByText('9 de 500 caracteres')).toBeInTheDocument();
    await salvar();
    await waitFor(() => expect(editar).toHaveBeenCalledTimes(1));
    expect(editar.mock.calls[0][0]).toMatchObject({
      nome: 'Reserva Distribuidora',
      whatsapp: '5581999990000',
      cnpj: '11222333000181',
      rodape_mensagem: 'Obrigado!',
    });
    expect(await screen.findByText('Configurações salvas.')).toBeInTheDocument();
    expect(screen.queryByText(/Ainda não salvo/)).not.toBeInTheDocument();
  });

  it('WhatsApp e CNPJ inválidos mostram erro nos campos sem chamar o servidor', async () => {
    await abrir();
    const editar = vi.spyOn(configService, 'editar');
    await userEvent.type(campoWhatsapp(), '81999');
    await userEvent.type(screen.getByLabelText('CNPJ (opcional)'), '123');
    await salvar();
    expect(await screen.findByText('Informe um CNPJ válido.')).toBeInTheDocument();
    expect(
      screen.getByText('Informe um WhatsApp com DDD (ex.: (81) 99999-0000).'),
    ).toBeInTheDocument();
    expect(editar).not.toHaveBeenCalled();
  });

  it('mostra o campo de e-mail de privacidade (LGPD) com a dica, preenchido com o valor salvo', async () => {
    await abrir({ ...CONFIG, email_privacidade: 'privacidade@loja.com' });
    expect(screen.getByLabelText('E-mail para assuntos de privacidade (LGPD)')).toHaveValue(
      'privacidade@loja.com',
    );
    expect(
      screen.getByText('Aparece na Política de Privacidade para os clientes pedirem seus dados.'),
    ).toBeInTheDocument();
  });

  it('salva o e-mail de privacidade em minúsculas; vazio envia null', async () => {
    await abrir();
    const editar = vi.spyOn(configService, 'editar').mockResolvedValue(CONFIG);
    await userEvent.type(
      screen.getByLabelText('E-mail para assuntos de privacidade (LGPD)'),
      'DPO@Loja.com',
    );
    await salvar();
    await waitFor(() => expect(editar).toHaveBeenCalledTimes(1));
    expect(editar.mock.calls[0][0]).toMatchObject({ email_privacidade: 'dpo@loja.com' });
    await userEvent.clear(screen.getByLabelText('E-mail para assuntos de privacidade (LGPD)'));
    await salvar();
    await waitFor(() => expect(editar).toHaveBeenCalledTimes(2));
    expect(editar.mock.calls[1][0].email_privacidade).toBeNull();
  });

  it('e-mail de privacidade inválido mostra erro no campo sem chamar o servidor', async () => {
    await abrir();
    const editar = vi.spyOn(configService, 'editar');
    await userEvent.type(
      screen.getByLabelText('E-mail para assuntos de privacidade (LGPD)'),
      'sem-arroba',
    );
    await salvar();
    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(editar).not.toHaveBeenCalled();
  });

  it('erro do servidor por campo aparece sob o campo', async () => {
    await abrir();
    vi.spyOn(configService, 'editar').mockRejectedValue(
      new ErroApi('Confira os campos informados.', {
        status: 400,
        campos: { endereco: 'Use no máximo 300 caracteres.' },
      }),
    );
    await salvar();
    expect(await screen.findByText('Use no máximo 300 caracteres.')).toBeInTheDocument();
  });

  it('logo: comprime com lado máximo de 600 px, envia e mostra a nova logo', async () => {
    await abrir();
    const blob = new Blob(['x'], { type: 'image/webp' });
    comprimir.mockResolvedValue(blob);
    const enviar = vi
      .spyOn(configService, 'enviarLogo')
      .mockResolvedValue({ ...CONFIG, logo_url: 'http://x/logo.webp' });
    const arquivo = new File(['img'], 'logo.png', { type: 'image/png' });
    await userEvent.upload(screen.getByLabelText('Escolher imagem da logo'), arquivo);
    await waitFor(() => expect(enviar).toHaveBeenCalledWith(blob));
    expect(comprimir).toHaveBeenCalledWith(arquivo, { ladoMax: 600 });
    expect(await screen.findByText('Logo atualizada.')).toBeInTheDocument();
    expect(screen.getByAltText('Logo atual da empresa')).toHaveAttribute(
      'src',
      'http://x/logo.webp',
    );
  });

  it('logo: falha na compressão mostra o aviso e não envia', async () => {
    await abrir({ ...CONFIG, logo_url: 'http://x/antiga.webp' });
    comprimir.mockRejectedValue(new Error('Não foi possível ler esta imagem. Tente outra foto.'));
    const enviar = vi.spyOn(configService, 'enviarLogo');
    await userEvent.upload(
      screen.getByLabelText('Escolher imagem da logo'),
      new File(['img'], 'logo.png', { type: 'image/png' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível ler esta imagem.');
    expect(enviar).not.toHaveBeenCalled();
    expect(screen.getByAltText('Logo atual da empresa')).toHaveAttribute(
      'src',
      'http://x/antiga.webp',
    );
  });

  it('logo: erro inesperado (rede/DOMException) mostra texto genérico em português', async () => {
    await abrir();
    comprimir.mockRejectedValue(new TypeError('Failed to fetch'));
    await userEvent.upload(
      screen.getByLabelText('Escolher imagem da logo'),
      new File(['img'], 'logo.png', { type: 'image/png' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível enviar a logo. Tente de novo.',
    );
  });

  it('a região aria-live da prévia já existe antes de digitar o número', async () => {
    await abrir();
    const regiao = screen.getByText(SEM_WHATSAPP).closest('[aria-live]');
    expect(regiao).toBeInTheDocument();
    await userEvent.type(campoWhatsapp(), '81999990000');
    expect(regiao).toContainElement(screen.getByText(PREVIA_11));
  });

  it('com alterações, sair da página pergunta antes', async () => {
    const roteador = await abrir();
    await userEvent.type(screen.getByLabelText('Endereço (opcional)'), 'Rua Nova, 1');
    await userEvent.click(screen.getByRole('link', { name: /Clientes/ }));
    const dialogo = await screen.findByRole('dialog', { name: 'Sair sem salvar?' });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(roteador.state.location.pathname).toBe('/configuracoes');
  });
});
