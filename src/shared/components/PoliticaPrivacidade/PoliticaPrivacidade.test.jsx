import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CHAVE_SESSAO_ADMIN } from '../../../admin/services/apiAdmin.js';
import { CHAVE_CARRINHO } from '../../../loja/services/carrinhoService.js';
import { CHAVE_DADOS_CLIENTE } from '../../../loja/services/dadosClienteService.js';
import { CHAVE_CONFIRMACAO } from '../../../loja/services/pedidoService.js';
import { CHAVE_AVISO_PRIVACIDADE } from '../../services/avisoPrivacidadeService.js';
import PoliticaPrivacidade from './PoliticaPrivacidade';
import { ITENS_ARMAZENAMENTO, SECOES, ULTIMA_ATUALIZACAO } from './constantes.js';

const EMPRESA = {
  nome: 'Distribuidora Teste',
  cnpj: '11222333000181',
  endereco: 'Rua das Flores, 10, Recife - PE',
  whatsapp: '5581999990000',
  email_privacidade: 'privacidade@teste.com',
};

describe('PoliticaPrivacidade', () => {
  it('mostra os dados da empresa e o contato por e-mail', () => {
    render(<PoliticaPrivacidade empresa={EMPRESA} />);
    expect(
      screen.getByRole('heading', { level: 1, name: /Política de Privacidade/ }),
    ).toBeVisible();
    expect(screen.getAllByText(/Distribuidora Teste/).length).toBeGreaterThan(0);
    expect(screen.getByText(/CNPJ: 11\.222\.333\/0001-81/)).toBeInTheDocument();
    expect(screen.getByText(/Rua das Flores, 10, Recife - PE/)).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: 'privacidade@teste.com' });
    expect(links[0]).toHaveAttribute('href', 'mailto:privacidade@teste.com');
  });

  it('sem e-mail, o contato é o WhatsApp da empresa formatado', () => {
    render(<PoliticaPrivacidade empresa={{ ...EMPRESA, email_privacidade: null }} />);
    expect(screen.getAllByText(/pelo WhatsApp da empresa: \+55 \(81\) 99999-0000/)).toHaveLength(2);
    expect(screen.queryByRole('link', { name: /@/ })).not.toBeInTheDocument();
  });

  it('sem e-mail e sem WhatsApp, usa os canais de atendimento da empresa', () => {
    render(<PoliticaPrivacidade empresa={{ nome: 'X', email_privacidade: '', whatsapp: null }} />);
    expect(screen.getAllByText(/pelos canais de atendimento da empresa/)).toHaveLength(2);
  });

  it('sem dados da empresa, usa o nome padrão e omite CNPJ e endereço', () => {
    render(<PoliticaPrivacidade />);
    expect(screen.getAllByText(/Reserva Distribuidora/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/CNPJ:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Endereço:/)).not.toBeInTheDocument();
  });

  it('tem sumário com âncoras para as 9 seções e a data da última atualização', () => {
    render(<PoliticaPrivacidade empresa={EMPRESA} />);
    const sumario = screen.getByRole('navigation', { name: 'Sumário' });
    expect(within(sumario).getAllByRole('link')).toHaveLength(9);
    SECOES.forEach(({ id }) => expect(document.getElementById(id)).not.toBeNull());
    expect(ULTIMA_ATUALIZACAO.iso).toBe('2026-11-22');
    expect(screen.getAllByText(/Última atualização:/)[0]).toHaveTextContent(
      '22 de novembro de 2026',
    );
  });

  it('afirma que não usa cookies de rastreamento nem de publicidade e que os dados do pedido não ficam no servidor', () => {
    render(<PoliticaPrivacidade empresa={EMPRESA} />);
    expect(screen.getByText(/Não usamos cookies de rastreamento nem de publicidade/)).toBeVisible();
    expect(screen.getByText(/não são armazenados/)).toBeInTheDocument();
  });

  it('informa retenção de até 2 dias, recuperação de senha, oposição e o contrato do fornecedor', () => {
    render(<PoliticaPrivacidade empresa={EMPRESA} />);
    expect(screen.getByText(/login e a recuperação de senha do painel/)).toHaveTextContent(
      'por até 2 dias (a limpeza é feita automaticamente todos os dias)',
    );
    expect(
      screen.getByText(/recuperação de senha do painel, e limite de pedidos/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/até 1 dia/)).not.toBeInTheDocument();
    expect(screen.getByText(/oposição ao tratamento/)).toHaveTextContent(/art. 18, §2º/);
    expect(
      screen.getByText(/contrato de tratamento de dados do próprio fornecedor/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/salvaguardas contratuais/)).not.toBeInTheDocument();
  });

  it('a tabela de armazenamento lista exatamente as chaves reais usadas pelo site', () => {
    render(<PoliticaPrivacidade empresa={EMPRESA} />);
    const reais = [
      CHAVE_CARRINHO,
      CHAVE_DADOS_CLIENTE,
      CHAVE_CONFIRMACAO,
      CHAVE_AVISO_PRIVACIDADE,
      CHAVE_SESSAO_ADMIN,
    ];
    expect(ITENS_ARMAZENAMENTO.map((i) => i.chave).sort()).toEqual([...reais].sort());
    reais.forEach((chave) => expect(screen.getByText(chave)).toBeInTheDocument());
    expect(screen.getByRole('columnheader', { name: 'Por quanto tempo' })).toBeInTheDocument();
  });

  it('informa que só o CEP vai para o ViaCEP', () => {
    render(<PoliticaPrivacidade empresa={EMPRESA} />);
    const item = screen.getByText('ViaCEP').closest('li');
    expect(item).toHaveTextContent('apenas o CEP');
    expect(item).toHaveTextContent('endereço IP');
    expect(item).toHaveTextContent('painel');
  });
});
