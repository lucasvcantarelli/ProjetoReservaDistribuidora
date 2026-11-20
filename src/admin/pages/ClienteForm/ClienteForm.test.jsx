import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../../shared/services/api.js';
import { logarComoAdmin, renderizarAdmin } from '../../../test/renderizarAdmin.jsx';
import { clientesService } from '../../services/clientesService.js';

const usuario = userEvent.setup({ delay: null });

const CNPJ_VALIDO = '11222333000181';
const CPF_VALIDO = '52998224725';
const MSG_DUPLICADO = 'Este documento já está cadastrado.';
const SUBTITULO = 'Cadastro interno da empresa — não cria acesso ao site.';

const PJ = {
  id: 'c2',
  tipo_pessoa: 'PJ',
  nome: 'João Souza',
  razao_social: 'Bar do João LTDA',
  nome_fantasia: 'Bar do João',
  cpf_cnpj: '11.222.333/0001-81',
  email: 'joao@x.com',
  telefone: '81999990000',
  cep: '50000000',
  rua: 'Rua A',
  numero: '10',
  complemento: '',
  bairro: 'Centro',
  cidade: 'Recife',
  uf: 'PE',
  observacoes: 'Paga à vista.',
};
const PF = {
  ...PJ,
  id: 'c1',
  tipo_pessoa: 'PF',
  nome: 'Maria Silva',
  razao_social: null,
  nome_fantasia: null,
  cpf_cnpj: '529.982.247-25',
};

async function abrir(cliente = PF) {
  logarComoAdmin();
  vi.spyOn(clientesService, 'obter').mockResolvedValue(cliente);
  const roteador = renderizarAdmin(`/clientes/${cliente.id}`);
  await screen.findByDisplayValue(cliente.nome);
  return roteador;
}

async function abrirNovo() {
  logarComoAdmin();
  const roteador = renderizarAdmin('/clientes/novo');
  await screen.findByRole('heading', { name: 'Novo cliente' });
  return roteador;
}

const salvar = () => usuario.click(screen.getByRole('button', { name: 'Salvar' }));
const digitar = (rotulo, texto) => usuario.type(screen.getByLabelText(rotulo), texto);

describe('ClienteForm - ficha', () => {
  it('mostra o subtítulo, as seções e a ficha preenchida, sem aviso antigo nem senha', async () => {
    await abrir(PJ);
    expect(screen.getByText(SUBTITULO)).toBeInTheDocument();
    for (const secao of [
      'Empresa',
      'Responsável',
      'Documento',
      'Contato',
      'Endereço',
      'Observações',
    ]) {
      expect(screen.getByRole('heading', { name: new RegExp(secao) })).toBeInTheDocument();
    }
    expect(screen.getByLabelText('Razão social')).toHaveValue('Bar do João LTDA');
    expect(screen.getByLabelText('Nome fantasia (opcional)')).toHaveValue('Bar do João');
    expect(screen.getByLabelText('Nome do responsável ou proprietário')).toHaveValue('João Souza');
    expect(screen.getByLabelText('CNPJ (opcional)')).toHaveValue('11.222.333/0001-81');
    expect(screen.getByLabelText('Telefone / WhatsApp (opcional)')).toHaveValue('(81) 99999-0000');
    expect(screen.getByLabelText('E-mail (opcional)')).toHaveValue('joao@x.com');
    expect(screen.getByLabelText('E-mail (opcional)')).toBeEnabled();
    expect(screen.getByLabelText('Observações (opcional)')).toHaveValue('Paga à vista.');
    expect(screen.getByText('13 de 1000 caracteres')).toBeInTheDocument();
    expect(screen.queryByText(/Somente o administrador/)).not.toBeInTheDocument();
    expect(screen.queryByText(/recuperação de conta/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/senha/i)).not.toBeInTheDocument();
  });

  it('pessoa física não mostra razão social nem nome fantasia e pede o nome do cliente', async () => {
    await abrir(PF);
    expect(screen.queryByLabelText('Razão social')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Nome fantasia (opcional)')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Nome do cliente')).toHaveValue('Maria Silva');
    expect(screen.getByLabelText('CPF (opcional)')).toHaveValue('529.982.247-25');
  });

  it('cadastra sem documento, e-mail, telefone nem endereço e volta para a lista', async () => {
    const roteador = await abrirNovo();
    const criar = vi.spyOn(clientesService, 'criar').mockResolvedValue({ ...PJ, cpf_cnpj: null });
    vi.spyOn(clientesService, 'listar').mockResolvedValue({ itens: [], total: 0 });
    await digitar('Razão social', 'Mercado Novo LTDA');
    await digitar('Nome do responsável ou proprietário', 'Ana Costa');
    await salvar();

    await waitFor(() => expect(criar).toHaveBeenCalledTimes(1));
    expect(criar.mock.calls[0][0]).toMatchObject({
      tipo_pessoa: 'PJ',
      razao_social: 'Mercado Novo LTDA',
      nome: 'Ana Costa',
      cpf_cnpj: null,
      email: null,
      telefone: null,
      cep: null,
      uf: null,
    });
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/clientes'));
    expect(await screen.findByText('Cliente cadastrado.')).toBeInTheDocument();
  });

  it('empresa nova exige razão social e responsável, sem chamar o servidor', async () => {
    await abrirNovo();
    const criar = vi.spyOn(clientesService, 'criar');
    await salvar();
    expect(await screen.findByText('Informe a razão social.')).toBeInTheDocument();
    expect(screen.getByText('Informe o nome.')).toBeInTheDocument();
    expect(criar).not.toHaveBeenCalled();
  });

  it('pessoa física nova: só o nome é obrigatório e o CPF vai em dígitos', async () => {
    await abrirNovo();
    const criar = vi.spyOn(clientesService, 'criar').mockResolvedValue(PF);
    vi.spyOn(clientesService, 'listar').mockResolvedValue({ itens: [], total: 0 });
    await usuario.click(screen.getByLabelText('Empresa'));
    await usuario.click(screen.getByLabelText('Pessoa física'));
    await digitar('Nome do cliente', 'Maria Silva');
    await digitar('CPF (opcional)', CPF_VALIDO);
    expect(screen.getByLabelText('CPF (opcional)')).toHaveValue('529.982.247-25');
    await salvar();
    await waitFor(() => expect(criar).toHaveBeenCalledTimes(1));
    expect(criar.mock.calls[0][0]).toMatchObject({
      tipo_pessoa: 'PF',
      nome: 'Maria Silva',
      cpf_cnpj: CPF_VALIDO,
      razao_social: null,
    });
  });

  it('novo PJ trocado para PF com fantasia preenchida envia nome_fantasia e razao_social null', async () => {
    await abrirNovo();
    const criar = vi.spyOn(clientesService, 'criar').mockResolvedValue(PF);
    vi.spyOn(clientesService, 'listar').mockResolvedValue({ itens: [], total: 0 });
    await digitar('Razão social', 'X LTDA');
    await digitar('Nome fantasia (opcional)', 'Fantasia X');
    await usuario.click(screen.getByLabelText('Pessoa física'));
    expect(screen.getByRole('heading', { name: /Tipo de cadastro/ })).toBeInTheDocument();
    await digitar('Nome do cliente', 'Maria Silva');
    await salvar();
    await waitFor(() => expect(criar).toHaveBeenCalledTimes(1));
    expect(criar.mock.calls[0][0]).toMatchObject({
      tipo_pessoa: 'PF',
      razao_social: null,
      nome_fantasia: null,
    });
  });

  it('documento preenchido e inválido mostra o erro no campo', async () => {
    await abrirNovo();
    const criar = vi.spyOn(clientesService, 'criar');
    await digitar('Razão social', 'X LTDA');
    await digitar('Nome do responsável ou proprietário', 'Ana');
    await digitar('CNPJ (opcional)', '123');
    await salvar();
    expect(await screen.findByText(/CNPJ válido/)).toBeInTheDocument();
    expect(criar).not.toHaveBeenCalled();
  });

  it('409 de documento duplicado aparece embaixo do campo do documento', async () => {
    await abrirNovo();
    vi.spyOn(clientesService, 'criar').mockRejectedValue(
      new ErroApi(MSG_DUPLICADO, { status: 409, campos: { cpf_cnpj: MSG_DUPLICADO } }),
    );
    await digitar('Razão social', 'X LTDA');
    await digitar('Nome do responsável ou proprietário', 'Ana');
    await digitar('CNPJ (opcional)', CNPJ_VALIDO);
    await salvar();
    await waitFor(() =>
      expect(screen.getByLabelText('CNPJ (opcional)')).toHaveAccessibleDescription(MSG_DUPLICADO),
    );
    expect(screen.queryByText('Cliente cadastrado.')).not.toBeInTheDocument();
  });

  it('edita a ficha, envia os campos e mostra "Cliente atualizado."', async () => {
    await abrir(PJ);
    const editar = vi
      .spyOn(clientesService, 'editar')
      .mockResolvedValue({ ...PJ, cidade: 'Olinda' });
    const cidade = screen.getByLabelText('Cidade');
    await usuario.clear(cidade);
    await usuario.type(cidade, 'Olinda');
    await salvar();
    await waitFor(() => expect(editar).toHaveBeenCalledTimes(1));
    const [id, dados] = editar.mock.calls[0];
    expect(id).toBe('c2');
    expect(dados).toMatchObject({
      tipo_pessoa: 'PJ',
      razao_social: 'Bar do João LTDA',
      nome_fantasia: 'Bar do João',
      cpf_cnpj: CNPJ_VALIDO,
      cidade: 'Olinda',
      observacoes: 'Paga à vista.',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByText('Cliente atualizado.')).toBeInTheDocument();
  });

  it('trocar o tipo de empresa para pessoa física limpa o documento e esconde a razão social', async () => {
    await abrir(PJ);
    await usuario.click(screen.getByLabelText('Pessoa física'));
    expect(screen.queryByLabelText('Razão social')).not.toBeInTheDocument();
    expect(screen.getByLabelText('CPF (opcional)')).toHaveValue('');
    await usuario.click(screen.getByLabelText('Empresa'));
    expect(screen.getByLabelText('CNPJ (opcional)')).toHaveValue('11.222.333/0001-81');
  });

  it('e-mail e telefone inválidos mostram erro nos campos', async () => {
    await abrir(PF);
    await usuario.clear(screen.getByLabelText('E-mail (opcional)'));
    await usuario.type(screen.getByLabelText('E-mail (opcional)'), 'sem-arroba');
    await usuario.clear(screen.getByLabelText('Telefone / WhatsApp (opcional)'));
    await usuario.type(screen.getByLabelText('Telefone / WhatsApp (opcional)'), '819');
    await salvar();
    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(screen.getByText(/telefone com DDD/)).toBeInTheDocument();
  });

  it('excluir da ficha pede confirmação, apaga e volta para a lista', async () => {
    const roteador = await abrir(PJ);
    const excluir = vi.spyOn(clientesService, 'excluir').mockResolvedValue(null);
    vi.spyOn(clientesService, 'listar').mockResolvedValue({ itens: [], total: 0 });
    await usuario.type(screen.getByLabelText('Nome do responsável ou proprietário'), ' Jr');
    await usuario.click(screen.getByRole('button', { name: 'Excluir cliente' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Excluir Bar do João LTDA?' });
    expect(within(dialogo).getByText('Essa ação não pode ser desfeita.')).toBeInTheDocument();
    expect(excluir).not.toHaveBeenCalled();
    await usuario.click(within(dialogo).getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(excluir).toHaveBeenCalledWith('c2'));
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/clientes'));
    expect(screen.queryByRole('dialog', { name: 'Sair sem salvar?' })).not.toBeInTheDocument();
    expect(await screen.findByText('Cliente excluído.')).toBeInTheDocument();
  });

  it('cancelar a confirmação não exclui', async () => {
    await abrir(PF);
    const excluir = vi.spyOn(clientesService, 'excluir');
    await usuario.click(screen.getByRole('button', { name: 'Excluir cliente' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Excluir Maria Silva?' });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(excluir).not.toHaveBeenCalled();
  });

  it('cliente novo não mostra o botão de excluir', async () => {
    await abrirNovo();
    expect(screen.queryByRole('button', { name: 'Excluir cliente' })).not.toBeInTheDocument();
  });

  it('com alterações, sair da página pergunta antes ("Sair sem salvar")', async () => {
    const roteador = await abrir();
    await usuario.type(screen.getByLabelText('Nome do cliente'), ' Souza');
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Sair sem salvar?' });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(roteador.state.location.pathname).toBe('/clientes/c1');
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));
    const segundo = await screen.findByRole('dialog', { name: 'Sair sem salvar?' });
    await usuario.click(within(segundo).getByRole('button', { name: 'Sair sem salvar' }));
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/clientes'));
  });

  it('sem alterações, Cancelar volta para a lista sem perguntar', async () => {
    const roteador = await abrir();
    vi.spyOn(clientesService, 'listar').mockResolvedValue({ itens: [], total: 0 });
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/clientes'));
  });

  it('falha ao carregar mostra a mensagem e tenta de novo', async () => {
    logarComoAdmin();
    const obter = vi
      .spyOn(clientesService, 'obter')
      .mockRejectedValueOnce(new ErroApi('Cliente não encontrado.', { status: 404 }))
      .mockResolvedValue(PF);
    renderizarAdmin('/clientes/c1');
    expect(await screen.findByText('Cliente não encontrado.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByDisplayValue('Maria Silva')).toBeInTheDocument();
    expect(obter).toHaveBeenCalledTimes(2);
  });
});
