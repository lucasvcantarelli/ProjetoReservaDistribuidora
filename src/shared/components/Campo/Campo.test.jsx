import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Campo from './Campo';

describe('Campo', () => {
  it('associa o label ao input', () => {
    render(<Campo label="E-mail" />);
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
  });

  it('liga erro e dica via aria-describedby e marca aria-invalid', () => {
    render(<Campo label="E-mail" erro="Inválido" dica="Use o e-mail da conta" />);
    const input = screen.getByLabelText('E-mail');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Use o e-mail da conta Inválido');
  });

  it('sem erro não marca aria-invalid nem describedby', () => {
    render(<Campo label="Nome" />);
    const input = screen.getByLabelText('Nome');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-describedby');
  });

  it('renderiza select e textarea pela prop "como"', () => {
    render(
      <>
        <Campo label="UF" como="select">
          <option>SP</option>
        </Campo>
        <Campo label="Obs" como="textarea" />
      </>,
    );
    expect(screen.getByLabelText('UF').tagName).toBe('SELECT');
    expect(screen.getByLabelText('Obs').tagName).toBe('TEXTAREA');
  });
});
