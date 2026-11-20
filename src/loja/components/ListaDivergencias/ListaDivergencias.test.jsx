import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ListaDivergencias from './ListaDivergencias';

const BASE = { chave: 'v1:unidade', variacao_id: 'v1', forma: 'unidade', produto_nome: 'Copo' };
const DIVERGENCIA = { variacao_id: 'v1', forma: 'unidade', tipo: 'indisponivel' };

describe('ListaDivergencias', () => {
  it('mostra o tamanho entre parênteses quando não está no nome do produto', () => {
    render(
      <ListaDivergencias
        divergencias={[DIVERGENCIA]}
        itensCarrinho={[{ ...BASE, nome_tamanho: 'M' }]}
      />,
    );
    expect(screen.getByText('Copo (M)')).toBeInTheDocument();
  });

  it('não repete o tamanho que já aparece no nome (sem diferenciar maiúsculas)', () => {
    render(
      <ListaDivergencias
        divergencias={[DIVERGENCIA]}
        itensCarrinho={[
          { ...BASE, produto_nome: 'Copo descartável 200 ML', nome_tamanho: '200 ml' },
        ]}
      />,
    );
    expect(screen.getByText('Copo descartável 200 ML')).toBeInTheDocument();
  });
});
