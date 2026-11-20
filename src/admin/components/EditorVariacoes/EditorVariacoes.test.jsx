import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { variacaoVazia } from '../../utils/produtoForm.js';
import EditorVariacoes from './EditorVariacoes';

function Exemplo({ inicial, erros = {}, onRemover = vi.fn() }) {
  const [variacoes, setVariacoes] = useState(inicial ?? [variacaoVazia()]);
  return (
    <EditorVariacoes
      variacoes={variacoes}
      erros={erros}
      onAdicionar={() => setVariacoes((v) => [...v, variacaoVazia()])}
      onMudar={(i, campo, valor) =>
        setVariacoes((v) => v.map((x, j) => (j === i ? { ...x, [campo]: valor } : x)))
      }
      onMover={vi.fn()}
      onRemover={onRemover}
    />
  );
}

const COM_FARDO = {
  ...variacaoVazia(),
  nome_tamanho: '200 ml',
  vende_unidade: true,
  preco_unidade_centavos: 10,
  vende_fardo: true,
  qtd_por_fardo: '1000',
  preco_fardo_centavos: 8500,
};

describe('EditorVariacoes', () => {
  it('cada tamanho começa vendendo por unidade; fardo só mostra campos depois de marcado', async () => {
    render(<Exemplo />);
    expect(screen.getByLabelText('Preço da unidade')).toBeInTheDocument();
    expect(screen.queryByLabelText('Quantidade por fardo')).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Vende por fardo'));
    expect(screen.getByLabelText('Quantidade por fardo')).toBeInTheDocument();
    expect(screen.getByLabelText('Preço do fardo')).toBeInTheDocument();
  });

  it('mostra quanto custa cada unidade no fardo', async () => {
    render(<Exemplo />);
    await userEvent.click(screen.getByLabelText('Vende por fardo'));
    await userEvent.type(screen.getByLabelText('Quantidade por fardo'), '1000');
    await userEvent.type(screen.getByLabelText('Preço do fardo'), '85');
    expect(screen.getByText('R$ 0,085 por unidade no fardo')).toBeInTheDocument();
  });

  it('avisa (sem bloquear) quando o fardo não sai mais barato por unidade', () => {
    render(<Exemplo inicial={[{ ...COM_FARDO, preco_unidade_centavos: 8 }]} />);
    expect(screen.getByText(/não está mais barato que a unidade avulsa/)).toBeInTheDocument();
  });

  it('sem aviso quando o fardo é mais barato', () => {
    render(<Exemplo inicial={[COM_FARDO]} />);
    expect(screen.getByText('R$ 0,085 por unidade no fardo')).toBeInTheDocument();
    expect(screen.queryByText(/não está mais barato/)).not.toBeInTheDocument();
  });

  it('adiciona um novo tamanho', async () => {
    render(<Exemplo />);
    await userEvent.click(screen.getByRole('button', { name: '+ Adicionar tamanho' }));
    expect(screen.getAllByLabelText('Tamanho')).toHaveLength(2);
  });

  it('mostra erros por campo, inclusive a forma de venda', () => {
    const erros = {
      'variacoes.0': 'Escolha ao menos uma forma de venda.',
      'variacoes.0.nome_tamanho': 'Campo obrigatório.',
    };
    render(<Exemplo erros={erros} />);
    expect(screen.getByText('Campo obrigatório.')).toBeInTheDocument();
    expect(screen.getByText('Escolha ao menos uma forma de venda.')).toBeInTheDocument();
    expect(screen.getByLabelText('Vende por unidade')).toHaveAttribute('aria-invalid', 'true');
  });

  it('desabilita subir no primeiro e descer no último', () => {
    render(<Exemplo inicial={[COM_FARDO, { ...variacaoVazia(), nome_tamanho: '1 L' }]} />);
    expect(screen.getByRole('button', { name: 'Mover 200 ml para cima' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Mover 1 L para baixo' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('chama onRemover do tamanho certo', async () => {
    const onRemover = vi.fn();
    render(
      <Exemplo
        inicial={[COM_FARDO, { ...variacaoVazia(), nome_tamanho: '1 L' }]}
        onRemover={onRemover}
      />,
    );
    const grupo = screen.getAllByRole('group')[1];
    await userEvent.click(within(grupo).getByRole('button', { name: 'Remover 1 L' }));
    expect(onRemover).toHaveBeenCalledWith(1);
  });
});
