import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useFocoNoPrimeiroErro } from './useFocoNoPrimeiroErro.js';

function Exemplo({ erros }) {
  const ref = useFocoNoPrimeiroErro(erros);
  return (
    <form ref={ref}>
      <input aria-label="a" />
      <input aria-label="b" aria-invalid="true" />
    </form>
  );
}

describe('useFocoNoPrimeiroErro', () => {
  it('sem erros não foca nem rola a página ao montar', () => {
    const rolar = vi.fn();
    HTMLElement.prototype.scrollIntoView = rolar; // o jsdom não implementa
    render(<Exemplo erros={{}} />);
    expect(document.body).toHaveFocus();
    expect(rolar).not.toHaveBeenCalled();
  });

  it('com erros foca o primeiro campo inválido', () => {
    render(<Exemplo erros={{ b: 'x' }} />);
    expect(screen.getByLabelText('b')).toHaveFocus();
  });
});
