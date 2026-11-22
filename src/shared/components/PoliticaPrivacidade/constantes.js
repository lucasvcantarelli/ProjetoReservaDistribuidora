// Data da última revisão do texto da política. Atualize sempre que o conteúdo mudar.
export const ULTIMA_ATUALIZACAO = { iso: '2026-11-22', texto: '22 de novembro de 2026' };

// Tudo o que o site guarda no navegador. As chaves são as reais (os testes conferem com as constantes dos serviços).
export const ITENS_ARMAZENAMENTO = [
  {
    chave: 'reserva.carrinho',
    onde: 'localStorage',
    paraQue: 'Loja: guarda os itens do carrinho para que não se percam ao fechar a página.',
    duracao: 'Até você esvaziar o carrinho ou limpar os dados do navegador.',
    apagar: 'Remova os itens no carrinho ou limpe os dados do site no navegador.',
  },
  {
    chave: 'reserva.dados-cliente',
    onde: 'localStorage',
    paraQue:
      'Loja: lembra seus dados de identificação no pedido. Só é gravado se você marcar "Lembrar meus dados neste aparelho".',
    duracao: 'Até você pedir para esquecer ou limpar os dados do navegador.',
    apagar: 'Use o botão "Esquecer meus dados" na tela de finalizar o pedido.',
  },
  {
    chave: 'reserva.confirmacaoPedido',
    onde: 'sessionStorage',
    paraQue:
      'Loja: lembra, nesta aba, que você foi ao WhatsApp e ainda precisa confirmar o envio do pedido.',
    duracao: 'Até você confirmar o envio ou fechar a aba.',
    apagar: 'Feche a aba ou confirme/cancele o envio do pedido.',
  },
  {
    chave: 'reserva.aviso-privacidade',
    onde: 'localStorage',
    paraQue:
      'Loja e painel: lembra que você já viu o aviso de privacidade, para não mostrá-lo de novo.',
    duracao: 'Até você limpar os dados do navegador.',
    apagar: 'Limpe os dados do site no navegador (o aviso volta a aparecer).',
  },
  {
    chave: 'reserva.admin.sessao',
    onde: 'localStorage',
    paraQue: 'Painel do administrador: mantém o administrador conectado.',
    duracao: 'Até o administrador sair ou a sessão expirar.',
    apagar: 'O administrador usa o botão "Sair" do painel.',
  },
];

export const SECOES = [
  { id: 'quem-somos', titulo: '1. Quem somos' },
  { id: 'dados', titulo: '2. Quais dados tratamos' },
  { id: 'finalidades', titulo: '3. Para que usamos os dados e base legal' },
  { id: 'cookies', titulo: '4. Cookies e armazenamento no navegador' },
  { id: 'compartilhamento', titulo: '5. Compartilhamento de dados' },
  { id: 'retencao', titulo: '6. Por quanto tempo guardamos' },
  { id: 'direitos', titulo: '7. Seus direitos' },
  { id: 'seguranca', titulo: '8. Segurança' },
  { id: 'alteracoes', titulo: '9. Alterações desta política' },
];
