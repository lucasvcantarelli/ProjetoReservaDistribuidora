import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TabelaDados from './TabelaDados';

const COLUNAS = [
  { chave: 'nome', titulo: 'Nome' },
  { chave: 'status', titulo: 'Status', celula: (item) => (item.ativo ? 'Ativa' : 'Inativa') },
];
const ITENS = [
  { id: '1', nome: 'Copos', ativo: true },
  { id: '2', nome: 'Pratos', ativo: false },
];
const VAZIO = { titulo: 'Nada por aqui.', texto: 'Crie o primeiro.' };

function renderizar(props) {
  return render(
    <TabelaDados rotulo="Itens" colunas={COLUNAS} itens={ITENS} vazio={VAZIO} {...props} />,
  );
}

describe('TabelaDados', () => {
  it('sem itens mostra o estado vazio e a ação opcional', () => {
    renderizar({
      itens: [],
      vazio: { ...VAZIO, acao: <button type="button">Criar agora</button> },
    });
    expect(screen.getByText('Nada por aqui.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar agora' })).toBeInTheDocument();
  });

  it('renderiza cabeçalhos, linhas e células personalizadas', () => {
    renderizar();
    const tabela = screen.getByRole('table', { name: 'Itens' });
    expect(
      within(tabela)
        .getAllByRole('columnheader')
        .map((c) => c.textContent),
    ).toEqual(['Nome', 'Status']);
    expect(within(tabela).getAllByRole('row')).toHaveLength(3);
    expect(screen.getByText('Ativa')).toBeInTheDocument();
    expect(screen.getByText('Inativa')).toBeInTheDocument();
  });

  it('cada célula leva o título da coluna em data-rotulo (usado nos cartões do celular)', () => {
    renderizar();
    const linha = screen.getByText('Copos').closest('tr');
    expect(within(linha).getByText('Copos')).toHaveAttribute('data-rotulo', 'Nome');
    expect(within(linha).getByText('Ativa')).toHaveAttribute('data-rotulo', 'Status');
  });

  it('com `acoes`, ganha a coluna Ações com os botões de cada linha', () => {
    renderizar({ acoes: (item) => <button>Editar {item.nome}</button> });
    expect(screen.getByRole('columnheader', { name: 'Ações' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar Copos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar Pratos' })).toBeInTheDocument();
  });

  it('sem itens mostra o estado vazio e nenhuma tabela', () => {
    renderizar({ itens: [] });
    expect(screen.getByRole('heading', { name: 'Nada por aqui.' })).toBeInTheDocument();
    expect(screen.getByText('Crie o primeiro.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('carregando mostra o indicador e não o vazio nem a tabela', () => {
    renderizar({ carregando: true, itens: [] });
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Nada por aqui.')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
