import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import CampoPreco from './CampoPreco';

function Exemplo({ inicial = null, onChange = () => {}, erro }) {
  const [valor, setValor] = useState(inicial);
  return (
    <CampoPreco
      label="Preço"
      valor={valor}
      erro={erro}
      onChange={(centavos) => {
        setValor(centavos);
        onChange(centavos);
      }}
    />
  );
}

async function digitar(texto) {
  const campo = screen.getByLabelText('Preço');
  await userEvent.type(campo, texto);
  return campo;
}

describe('CampoPreco', () => {
  it.each([
    ['10', 1000],
    ['10,5', 1050],
    ['1.234,56', 123456],
    ['0,99', 99],
  ])('aceita "%s" e emite %i centavos', async (texto, centavos) => {
    const onChange = vi.fn();
    render(<Exemplo onChange={onChange} />);
    await digitar(texto);
    expect(onChange).toHaveBeenLastCalledWith(centavos);
  });

  it('formata ao sair do campo', async () => {
    render(<Exemplo />);
    const campo = await digitar('10,5');
    await userEvent.tab();
    expect(campo).toHaveValue('10,50');
    expect(screen.getByLabelText('Preço')).toHaveAttribute('inputmode', 'decimal');
  });

  it('mostra o valor inicial em reais com milhar', () => {
    render(<Exemplo inicial={123456} />);
    expect(screen.getByLabelText('Preço')).toHaveValue('1.234,56');
    expect(screen.getByText('R$')).toBeInTheDocument();
  });

  it('texto inválido emite null e mostra "Informe um preço válido." ao sair', async () => {
    const onChange = vi.fn();
    render(<Exemplo onChange={onChange} />);
    const campo = await digitar('abc');
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.queryByText('Informe um preço válido.')).not.toBeInTheDocument();
    await userEvent.tab();
    expect(screen.getByText('Informe um preço válido.')).toBeInTheDocument();
    expect(campo).toHaveAttribute('aria-invalid', 'true');
  });

  it('apagar tudo emite null', async () => {
    const onChange = vi.fn();
    render(<Exemplo inicial={500} onChange={onChange} />);
    await userEvent.clear(screen.getByLabelText('Preço'));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('mostra o erro vindo da validação do formulário', () => {
    render(<Exemplo erro="Informe um preço válido." />);
    expect(screen.getByLabelText('Preço')).toHaveAttribute('aria-invalid', 'true');
  });
});
