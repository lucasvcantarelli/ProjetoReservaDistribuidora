import { readFileSync } from 'node:fs';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Modal from './Modal';

function Exemplo({ onFechar = () => {} }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <main data-testid="fundo">
        <button onClick={() => setAberto(true)}>Abrir</button>
      </main>
      <Modal
        aberto={aberto}
        titulo="Título"
        onFechar={() => {
          onFechar();
          setAberto(false);
        }}
      >
        <button>Primeiro</button>
        <button>Último</button>
      </Modal>
    </>
  );
}

describe('Modal', () => {
  it('não renderiza fechado; aberto tem role dialog rotulado pelo título', async () => {
    render(<Exemplo />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('Abrir'));
    const dialogo = screen.getByRole('dialog', { name: 'Título' });
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
  });

  it('foca o primeiro item, prende o foco com Tab e Shift+Tab', async () => {
    render(<Exemplo />);
    await userEvent.click(screen.getByText('Abrir'));
    expect(screen.getByText('Primeiro')).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByText('Último')).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByText('Primeiro')).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByText('Último')).toHaveFocus();
  });

  it('deixa o fundo inerte enquanto aberto', async () => {
    render(<Exemplo />);
    await userEvent.click(screen.getByText('Abrir'));
    expect(screen.getByTestId('fundo').closest('[inert]')).not.toBeNull();
  });

  it('Esc fecha, remove o inert e devolve o foco ao botão que abriu', async () => {
    const onFechar = vi.fn();
    render(<Exemplo onFechar={onFechar} />);
    await userEvent.click(screen.getByText('Abrir'));
    await userEvent.keyboard('{Escape}');
    expect(onFechar).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.querySelector('[inert]')).toBeNull();
    expect(screen.getByText('Abrir')).toHaveFocus();
  });

  it('re-render do pai a cada tecla não tira o foco do input dentro do modal', async () => {
    function Formulario() {
      const [texto, setTexto] = useState('');
      return (
        <Modal aberto titulo="Form" onFechar={() => setTexto('')}>
          <button>Antes</button>
          <input aria-label="Nome" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </Modal>
      );
    }
    render(<Formulario />);
    await userEvent.click(screen.getByLabelText('Nome'));
    await userEvent.keyboard('abc');
    expect(screen.getByLabelText('Nome')).toHaveValue('abc');
    expect(screen.getByLabelText('Nome')).toHaveFocus();
  });

  it('com modais aninhados, Esc fecha só o do topo', async () => {
    function Aninhado() {
      const [a, setA] = useState(true);
      const [b, setB] = useState(true);
      return (
        <>
          <Modal aberto={a} titulo="A" onFechar={() => setA(false)}>
            <button>Em A</button>
          </Modal>
          <Modal aberto={b} titulo="B" onFechar={() => setB(false)}>
            <button>Em B</button>
          </Modal>
        </>
      );
    }
    render(<Aninhado />);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'B' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'A' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

const lerCss = (caminho) => readFileSync(caminho, 'utf8');

function luminancia(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe('Modal (cor do título)', () => {
  it('usa uma cor de token com contraste mínimo de 4,5:1 sobre o fundo branco', () => {
    const css = lerCss('src/shared/components/Modal/Modal.module.css');
    const tokens = lerCss('src/shared/styles/tokens.css');
    const token = css.match(/\.titulo\s*\{[^}]*color:\s*var\((--[\w-]+)\)/)[1];
    const cor = tokens.match(new RegExp(`${token}: *(#[0-9a-f]{6})`, 'i'))[1];
    const contraste = 1.05 / (luminancia(cor) + 0.05);
    expect(contraste).toBeGreaterThanOrEqual(4.5);
  });
});
