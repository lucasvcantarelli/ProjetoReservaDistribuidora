import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { logarComoAdmin, renderizarAdmin } from '../test/renderizarAdmin.jsx';
import { clientesService } from './services/clientesService.js';

const CLIENTE = {
  id: 'c1',
  tipo_pessoa: 'PF',
  nome: 'Maria Silva',
  razao_social: null,
  nome_fantasia: null,
  cpf_cnpj: null,
  email: null,
  telefone: null,
  cep: null,
  rua: null,
  numero: null,
  complemento: null,
  bairro: null,
  cidade: null,
  uf: null,
  observacoes: '',
};

describe('rotas de clientes do painel', () => {
  it('/clientes mostra a lista', async () => {
    logarComoAdmin();
    vi.spyOn(clientesService, 'listar').mockResolvedValue({ itens: [CLIENTE], total: 1 });
    renderizarAdmin('/clientes');
    expect(await screen.findByRole('heading', { name: 'Clientes' })).toBeInTheDocument();
    expect(await screen.findByText('1 cliente cadastrado')).toBeInTheDocument();
  });

  it('/clientes/novo abre o cadastro (e não busca nenhum cliente)', async () => {
    logarComoAdmin();
    const obter = vi.spyOn(clientesService, 'obter');
    renderizarAdmin('/clientes/novo');
    expect(await screen.findByRole('heading', { name: 'Novo cliente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
    expect(obter).not.toHaveBeenCalled();
  });

  it('/clientes/:id abre a ficha do cliente', async () => {
    logarComoAdmin();
    vi.spyOn(clientesService, 'obter').mockResolvedValue(CLIENTE);
    renderizarAdmin('/clientes/c1');
    expect(await screen.findByRole('heading', { name: 'Ficha do cliente' })).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Maria Silva')).toBeInTheDocument();
  });
});
