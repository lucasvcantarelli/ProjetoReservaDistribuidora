import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../../shared/services/api.js';
import { logarComoAdmin, renderizarAdmin } from '../../../test/renderizarAdmin.jsx';
import { clientesService } from '../../services/clientesService.js';

const PF = {
  id: 'c1',
  nome: 'Maria Silva',
  razao_social: null,
  nome_fantasia: null,
  email: 'maria@x.com',
  tipo_pessoa: 'PF',
  cpf_cnpj: '529.982.247-25',
  telefone: '(81) 99999-0000',
  cidade: 'Recife',
  uf: 'PE',
};
const PJ = {
  ...PF,
  id: 'c2',
  nome: 'João Souza',
  razao_social: 'Bar do João LTDA',
  nome_fantasia: 'Bar do João',
  email: 'joao@x.com',
  tipo_pessoa: 'PJ',
  cpf_cnpj: '11.222.333/0001-81',
  telefone: '(81) 3333-4444',
};
const SEM_DOCUMENTO = {
  ...PJ,
  id: 'c3',
  nome: 'Rita Lima',
  razao_social: 'Mercadinho Rita ME',
  nome_fantasia: null,
  cpf_cnpj: null,
  telefone: null,
  cidade: null,
  uf: null,
};

function abrir(url = '/clientes', itens = [PF, PJ], total = itens.length) {
  logarComoAdmin();
  const listar = vi.spyOn(clientesService, 'listar').mockResolvedValue({ itens, total });
  return { roteador: renderizarAdmin(url), listar };
}

describe('Clientes', () => {
  it('lista empresa/cliente, responsável, documento, telefone e cidade/UF', async () => {
    abrir();
    const pj = (await screen.findByText('Bar do João LTDA')).closest('tr');
    expect(within(pj).getByText('Bar do João')).toBeInTheDocument();
    expect(within(pj).getByText('João Souza')).toBeInTheDocument();
    expect(within(pj).getByText('11.222.333/0001-81')).toBeInTheDocument();
    expect(within(pj).getByText('(81) 3333-4444')).toBeInTheDocument();
    expect(within(pj).getByText('Recife/PE')).toBeInTheDocument();
    const pf = screen.getByText('Maria Silva').closest('tr');
    expect(within(pf).getByText('529.982.247-25')).toBeInTheDocument();
    expect(within(pf).getByText('(81) 99999-0000')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Responsável' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /e-mail/i })).not.toBeInTheDocument();
  });

  it('cliente sem documento, telefone e cidade mostra traço nas colunas', async () => {
    abrir('/clientes', [SEM_DOCUMENTO]);
    const linha = (await screen.findByText('Mercadinho Rita ME')).closest('tr');
    expect(within(linha).getAllByText('—')).toHaveLength(3);
  });

  it('mostra o total no singular e no plural', async () => {
    abrir();
    expect(await screen.findByText('2 clientes cadastrados')).toBeInTheDocument();
  });

  it('com um só cliente usa o singular', async () => {
    abrir('/clientes', [PF]);
    expect(await screen.findByText('1 cliente cadastrado')).toBeInTheDocument();
  });

  it('com busca, o contador fala em resultados', async () => {
    abrir('/clientes?busca=maria', [PF]);
    expect(await screen.findByText('1 resultado')).toBeInTheDocument();
  });

  it('com busca e vários resultados, usa o plural', async () => {
    abrir('/clientes?busca=a', [PF, PJ]);
    expect(await screen.findByText('2 resultados')).toBeInTheDocument();
  });

  it('sem clientes mostra o estado vazio com o botão de cadastrar o primeiro', async () => {
    const { roteador } = abrir('/clientes', []);
    expect(await screen.findByText('Nenhum cliente cadastrado ainda.')).toBeInTheDocument();
    expect(screen.queryByText(/clientes? cadastrados?$/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar primeiro cliente' }));
    expect(roteador.state.location.pathname).toBe('/clientes/novo');
  });

  it('"Novo cliente" abre o cadastro', async () => {
    const { roteador } = abrir();
    await screen.findByText('Maria Silva');
    await userEvent.click(screen.getByRole('button', { name: 'Novo cliente' }));
    expect(roteador.state.location.pathname).toBe('/clientes/novo');
  });

  it('mostra a dica da busca; "Ver ficha" e o nome abrem a ficha do cliente', async () => {
    const { roteador } = abrir();
    expect(
      await screen.findByText('Busque por empresa, responsável, documento, telefone ou e-mail'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ver ficha de Bar do João LTDA' }));
    expect(roteador.state.location.pathname).toBe('/clientes/c2');
  });

  it('clicar no nome da empresa abre a ficha', async () => {
    const { roteador } = abrir();
    await userEvent.click(await screen.findByRole('link', { name: 'Maria Silva' }));
    expect(roteador.state.location.pathname).toBe('/clientes/c1');
  });

  it('excluir pede confirmação, apaga e recarrega a lista', async () => {
    const { listar } = abrir();
    const excluir = vi.spyOn(clientesService, 'excluir').mockResolvedValue(null);
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir Bar do João LTDA' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Excluir Bar do João LTDA?' });
    expect(within(dialogo).getByText('Essa ação não pode ser desfeita.')).toBeInTheDocument();
    expect(excluir).not.toHaveBeenCalled();
    listar.mockResolvedValue({ itens: [PF], total: 1 });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(excluir).toHaveBeenCalledWith('c2'));
    expect(await screen.findByText('Cliente excluído.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Bar do João LTDA')).not.toBeInTheDocument());
    expect(screen.getByText('1 cliente cadastrado')).toBeInTheDocument();
  });

  it('cancelar a confirmação não exclui', async () => {
    abrir();
    const excluir = vi.spyOn(clientesService, 'excluir');
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir Maria Silva' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Excluir Maria Silva?' });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(excluir).not.toHaveBeenCalled();
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
  });

  it('falha ao excluir mostra o erro e mantém a lista', async () => {
    abrir();
    vi.spyOn(clientesService, 'excluir').mockRejectedValue(
      new ErroApi('Cliente não encontrado.', { status: 404 }),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir Maria Silva' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Excluir Maria Silva?' });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }));
    expect(await screen.findByText('Cliente não encontrado.')).toBeInTheDocument();
  });

  it('busca com atraso grava ?busca= na URL e recarrega; sem resultado explica', async () => {
    const { roteador, listar } = abrir();
    await screen.findByText('Maria Silva');
    listar.mockResolvedValue({ itens: [], total: 0 });
    await userEvent.type(screen.getByLabelText('Buscar'), '529');
    await waitFor(() => expect(roteador.state.location.search).toBe('?busca=529'));
    await waitFor(() => expect(listar).toHaveBeenLastCalledWith({ busca: '529', pagina: 1 }));
    expect(await screen.findByText('Nenhum cliente encontrado.')).toBeInTheDocument();
  });

  it('pagina quando há mais de uma página', async () => {
    const { roteador, listar } = abrir('/clientes', [PF], 50);
    await screen.findByText('Maria Silva');
    expect(screen.getByText('50 clientes cadastrados')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /próxima/i }));
    await waitFor(() => expect(roteador.state.location.search).toBe('?pagina=2'));
    expect(listar).toHaveBeenLastCalledWith({ busca: '', pagina: 2 });
  });
});
