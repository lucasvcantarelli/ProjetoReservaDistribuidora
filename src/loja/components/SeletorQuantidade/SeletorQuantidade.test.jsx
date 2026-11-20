import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import SeletorQuantidade from './SeletorQuantidade';

function Exemplo({ inicial = 1 }) {
  const [valor, setValor] = useState(inicial);
  return <SeletorQuantidade valor={valor} onMudar={setValor} />;
}

describe('SeletorQuantidade', () => {
  it('não deixa passar de 1 para baixo nem de 99.999 para cima', async () => {
    const { unmount } = render(<Exemplo inicial={1} />);
    expect(screen.getByRole('button', { name: /diminuir/i })).toBeDisabled();
    unmount();
    render(<Exemplo inicial={99999} />);
    expect(screen.getByRole('button', { name: /aumentar/i })).toBeDisabled();
  });

  it('incrementa e decrementa pelos botões', async () => {
    render(<Exemplo inicial={5} />);
    await userEvent.click(screen.getByRole('button', { name: /aumentar/i }));
    expect(screen.getByRole('textbox', { name: 'Quantidade' })).toHaveValue('6');
    await userEvent.click(screen.getByRole('button', { name: /diminuir/i }));
    await userEvent.click(screen.getByRole('button', { name: /diminuir/i }));
    expect(screen.getByRole('textbox', { name: 'Quantidade' })).toHaveValue('4');
  });

  it('digitação: limita ao máximo, ignora letras e volta ao valor válido ao sair', async () => {
    render(<Exemplo inicial={3} />);
    const campo = screen.getByRole('textbox', { name: 'Quantidade' });
    await userEvent.clear(campo);
    await userEvent.type(campo, '1a2');
    expect(campo).toHaveValue('12');
    await userEvent.clear(campo);
    await userEvent.type(campo, '500000');
    expect(campo).toHaveValue('99999');
    await userEvent.clear(campo);
    await userEvent.tab();
    expect(campo).toHaveValue('99999');
  });
});
