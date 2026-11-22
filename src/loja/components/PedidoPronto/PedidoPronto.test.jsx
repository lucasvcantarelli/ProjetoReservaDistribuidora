import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PedidoPronto from './PedidoPronto.jsx';

const LINK = 'https://wa.me/5581999990000?text=oi';

describe('PedidoPronto', () => {
  it('fora do Android mostra um botão só, com o link wa.me', () => {
    render(<PedidoPronto link={LINK} onAbrir={() => {}} android={false} />);
    expect(screen.getByRole('link', { name: 'Abrir WhatsApp' })).toHaveAttribute('href', LINK);
    expect(screen.queryByRole('link', { name: /Business/ })).not.toBeInTheDocument();
  });

  it('no Android deixa escolher entre WhatsApp e WhatsApp Business', async () => {
    const onAbrir = vi.fn();
    render(<PedidoPronto link={LINK} onAbrir={onAbrir} android />);
    expect(screen.getByText('Escolha por qual WhatsApp enviar.')).toBeInTheDocument();
    const normal = screen.getByRole('link', { name: 'Enviar pelo WhatsApp' });
    const business = screen.getByRole('link', { name: 'Enviar pelo WhatsApp Business' });
    expect(normal.getAttribute('href')).toContain('package=com.whatsapp;');
    expect(business.getAttribute('href')).toContain('package=com.whatsapp.w4b;');
    expect(normal).not.toHaveAttribute('target');
    normal.addEventListener('click', (e) => e.preventDefault());
    business.addEventListener('click', (e) => e.preventDefault());
    await userEvent.click(normal);
    await userEvent.click(business);
    expect(onAbrir).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('link', { name: 'Abrir WhatsApp' })).not.toBeInTheDocument();
  });

  it('no Android sempre deixa uma saída pelo link comum do WhatsApp', () => {
    render(<PedidoPronto link={LINK} onAbrir={() => {}} android />);
    const comum = screen.getByRole('link', { name: 'Não abriu? Use o link do WhatsApp' });
    expect(comum).toHaveAttribute('href', LINK);
    expect(comum).toHaveAttribute('target', '_blank');
  });
});
