import { describe, expect, it } from 'vitest';
import {
  LIMITE_ITENS,
  QUANTIDADE_MAXIMA,
  linkWhatsapp,
  montarMensagem,
  revisarItens,
  textoBemFormado,
  validarItensCarrinho,
} from './pedido.js';

const ID_A = '11111111-1111-4111-8111-111111111111';
const ID_B = '22222222-2222-4222-8222-222222222222';

function variacao(sobrescrever = {}) {
  return {
    id: ID_A,
    nome_tamanho: 'M',
    ativo: true,
    vende_unidade: true,
    preco_unidade_centavos: 50,
    vende_fardo: true,
    qtd_por_fardo: 1000,
    preco_fardo_centavos: 8500,
    produto: { nome: 'Sacola plástica branca', ativo: true },
    ...sobrescrever,
  };
}

const item = (extra = {}) => ({ variacao_id: ID_A, forma: 'fardo', quantidade: 3, ...extra });

describe('validarItensCarrinho', () => {
  it('aceita itens válidos e descarta campos extras', () => {
    const r = validarItensCarrinho([item({ preco: 1, nome: 'x' })]);
    expect(r).toEqual({ ok: true, itens: [item()] });
  });

  it.each([0, -1, 1.5, '3', 100000, NaN, null])('rejeita quantidade %s', (quantidade) => {
    const r = validarItensCarrinho([item({ quantidade })]);
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/quantidade/i);
  });

  it('aceita os limites 1 e 99999', () => {
    expect(QUANTIDADE_MAXIMA).toBe(99999);
    expect(
      validarItensCarrinho([item({ quantidade: 1 }), item({ forma: 'unidade', quantidade: 99999 })])
        .ok,
    ).toBe(true);
  });

  it('rejeita não-array, item não-objeto, id inválido e forma inválida', () => {
    expect(validarItensCarrinho('x').ok).toBe(false);
    expect(validarItensCarrinho(undefined).ok).toBe(false);
    expect(validarItensCarrinho([null]).ok).toBe(false);
    expect(validarItensCarrinho([item({ variacao_id: 'abc' })]).ok).toBe(false);
    expect(validarItensCarrinho([item({ forma: 'caixa' })]).ok).toBe(false);
  });

  it('rejeita linhas repetidas cuja soma passa de 99999', () => {
    const r = validarItensCarrinho([item({ quantidade: 99999 }), item({ quantidade: 1 })]);
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/soma das quantidades/i);
    const outraForma = validarItensCarrinho([
      item({ quantidade: 99999 }),
      item({ quantidade: 1, forma: 'unidade' }),
    ]);
    expect(outraForma.ok).toBe(true);
  });

  it('rejeita carrinho vazio e mais de 200 itens', () => {
    expect(validarItensCarrinho([]).ok).toBe(false);
    const muitos = Array.from({ length: LIMITE_ITENS + 1 }, () => item());
    expect(validarItensCarrinho(muitos).ok).toBe(false);
    expect(validarItensCarrinho(muitos.slice(0, LIMITE_ITENS)).ok).toBe(true);
  });
});

describe('revisarItens', () => {
  it('calcula subtotal e total (3 fardos a 8500 = 25500)', () => {
    const r = revisarItens([item(), item({ forma: 'unidade', quantidade: 10 })], [variacao()]);
    expect(r.divergencias).toEqual([]);
    expect(r.itens[0]).toEqual({
      variacao_id: ID_A,
      forma: 'fardo',
      quantidade: 3,
      produto_nome: 'Sacola plástica branca',
      nome_tamanho: 'M',
      qtd_por_fardo: 1000,
      preco_centavos: 8500,
      subtotal_centavos: 25500,
    });
    expect(r.itens[1].qtd_por_fardo).toBeUndefined();
    expect(r.itens[1].subtotal_centavos).toBe(500);
    expect(r.total_centavos).toBe(26000);
  });

  it('une linhas repetidas de mesma variação e forma somando quantidades', () => {
    const r = revisarItens([item({ quantidade: 2 }), item({ quantidade: 5 })], [variacao()]);
    expect(r.itens).toHaveLength(1);
    expect(r.itens[0].quantidade).toBe(7);
  });

  it('ignora nome/preço vindos do carrinho', () => {
    const r = revisarItens([item({ preco_centavos: 1, produto_nome: 'Hack' })], [variacao()]);
    expect(r.itens[0].preco_centavos).toBe(8500);
    expect(r.itens[0].produto_nome).toBe('Sacola plástica branca');
  });

  it.each([
    ['inexistente', []],
    ['variação inativa', [variacao({ ativo: false })]],
    ['produto inativo', [variacao({ produto: { nome: 'X', ativo: false } })]],
    ['forma não vendida', [variacao({ vende_fardo: false })]],
    ['sem produto', [variacao({ produto: null })]],
  ])('%s -> indisponivel e fora de itens', (_nome, banco) => {
    const r = revisarItens([item()], banco);
    expect(r.itens).toEqual([]);
    expect(r.divergencias).toEqual([{ variacao_id: ID_A, forma: 'fardo', tipo: 'indisponivel' }]);
    expect(r.total_centavos).toBe(0);
  });

  it('detecta preço que mudou, mantendo o item com o preço atual', () => {
    const r = revisarItens([item()], [variacao()], { [`${ID_A}:fardo`]: 8000 });
    expect(r.divergencias).toEqual([
      {
        variacao_id: ID_A,
        forma: 'fardo',
        tipo: 'preco_mudou',
        preco_anterior_centavos: 8000,
        preco_atual_centavos: 8500,
      },
    ]);
    expect(r.itens[0].preco_centavos).toBe(8500);
  });

  it('não gera divergência quando o preço visto é igual ou ausente', () => {
    const igual = revisarItens([item()], [variacao()], { [`${ID_A}:fardo`]: 8500 });
    expect(igual.divergencias).toEqual([]);
    expect(revisarItens([item()], [variacao()]).divergencias).toEqual([]);
  });

  it('subtotal ou total fora do inteiro seguro -> indisponivel, sem total inválido', () => {
    const enorme = variacao({ preco_unidade_centavos: Number.MAX_SAFE_INTEGER });
    const r = revisarItens([item({ forma: 'unidade', quantidade: 2 })], [enorme]);
    expect(r.itens).toEqual([]);
    expect(r.divergencias[0].tipo).toBe('indisponivel');
    const grande = variacao({ preco_unidade_centavos: Math.floor(Number.MAX_SAFE_INTEGER / 2) });
    const dois = revisarItens(
      [
        item({ forma: 'unidade', quantidade: 1 }),
        item({ forma: 'fardo', quantidade: 1 }),
        item({ variacao_id: ID_B, forma: 'unidade', quantidade: 1 }),
      ],
      [grande, { ...grande, id: ID_B, preco_fardo_centavos: 8500 }],
    );
    expect(Number.isSafeInteger(dois.total_centavos)).toBe(true);
    expect(dois.divergencias).toHaveLength(1);
  });

  it('mistura itens ok e indisponíveis', () => {
    const r = revisarItens([item(), item({ variacao_id: ID_B })], [variacao()]);
    expect(r.itens).toHaveLength(1);
    expect(r.divergencias).toHaveLength(1);
    expect(r.divergencias[0].variacao_id).toBe(ID_B);
  });
});

const empresa = { nome: 'Reserva Distribuidora', rodape_mensagem: '' };
const clientePf = {
  tipo_pessoa: 'PF',
  nome: 'João da Silva',
  cpf_cnpj: '52998224725',
  email: 'joao@exemplo.com',
  telefone: '81999990000',
  rua: 'Rua X',
  numero: '123',
  complemento: '',
  bairro: 'Centro',
  cidade: 'Recife',
  uf: 'PE',
  cep: '50000000',
};
const clientePj = {
  ...clientePf,
  tipo_pessoa: 'PJ',
  cpf_cnpj: '12345678000190',
  razao_social: 'João Descartáveis LTDA',
};
const itensRevisados = [
  {
    variacao_id: ID_A,
    forma: 'fardo',
    quantidade: 3,
    produto_nome: 'Sacola plástica branca',
    nome_tamanho: 'M',
    qtd_por_fardo: 1000,
    preco_centavos: 8500,
    subtotal_centavos: 25500,
  },
  {
    variacao_id: ID_B,
    forma: 'unidade',
    quantidade: 10,
    produto_nome: 'Copo descartável 200 ml',
    nome_tamanho: '200 ml',
    preco_centavos: 50,
    subtotal_centavos: 500,
  },
];
const montar = (extra = {}) =>
  montarMensagem({
    empresa,
    cliente: clientePf,
    itens: itensRevisados,
    total_centavos: 26000,
    observacao: '',
    ...extra,
  });

describe('montarMensagem', () => {
  it('PF: sem CPF, sem e-mail e sem palavra CPF', () => {
    const m = montar();
    expect(m).not.toContain('52998224725');
    expect(m).not.toContain('529.982.247-25');
    expect(m).not.toMatch(/CPF/i);
    expect(m).not.toContain('joao@exemplo.com');
    expect(m).not.toContain('CNPJ');
  });

  it('PJ: CNPJ formatado e razão social', () => {
    const m = montar({ cliente: clientePj });
    expect(m).toContain('🪪 CNPJ: 12.345.678/0001-90 — Razão social: João Descartáveis LTDA');
  });

  it('segue o layout do spec', () => {
    expect(montar({ observacao: 'entregar pela manhã' })).toBe(
      [
        '🛒 *NOVO PEDIDO — Reserva Distribuidora*',
        '',
        '👤 *Cliente:* João da Silva',
        '📞 (81) 99999-0000',
        '📍 Rua X, 123 — Centro — Recife/PE — CEP 50000-000',
        '',
        '*Itens:*',
        '• 3x Sacola plástica branca — Tam. M — Fardo (1.000 un.) — R$ 85,00 = R$ 255,00',
        '• 10x Copo descartável 200 ml — Tam. 200 ml — Unidade — R$ 0,50 = R$ 5,00',
        '',
        '💰 *Total: R$ 260,00*',
        '📝 Obs: entregar pela manhã',
      ].join('\n'),
    );
  });

  it('inclui complemento após o número', () => {
    const m = montar({ cliente: { ...clientePf, complemento: 'apto 4' } });
    expect(m).toContain('📍 Rua X, 123, apto 4 — Centro');
  });

  it('telefone de 10 dígitos', () => {
    const m = montar({ cliente: { ...clientePf, telefone: '(81) 3333-4444' } });
    expect(m).toContain('📞 (81) 3333-4444');
  });

  it('observação vazia ou só espaços: sem linha Obs', () => {
    expect(montar()).not.toContain('Obs');
    expect(montar({ observacao: '  \n ' })).not.toContain('Obs');
    expect(montar({ observacao: undefined })).not.toContain('Obs');
  });

  it('observação preserva quebras internas e faz trim', () => {
    expect(montar({ observacao: '  a\nb  ' })).toContain('📝 Obs: a\nb');
  });

  it('rodapé da empresa quando existir', () => {
    const m = montar({ empresa: { ...empresa, rodape_mensagem: 'Obrigado!' } });
    expect(m.endsWith('\n\nObrigado!')).toBe(true);
  });
});

describe('linkWhatsapp', () => {
  it('adiciona 55 a número com máscara de 11 dígitos', () => {
    expect(linkWhatsapp('(81) 99999-0000', 'x')).toBe('https://wa.me/5581999990000?text=x');
  });

  it('adiciona 55 a número de 10 dígitos e não duplica quando já tem', () => {
    expect(linkWhatsapp('8133334444', 'x')).toContain('wa.me/558133334444?');
    expect(linkWhatsapp('5581999990000', 'x')).toContain('wa.me/5581999990000?');
    expect(linkWhatsapp('+55 81 99999-0000', 'x')).toContain('wa.me/5581999990000?');
  });

  it('surrogate solto em texto livre nunca lança URIError', () => {
    expect(textoBemFormado('a\ud800b')).toBe('a�b');
    expect(textoBemFormado('😀')).toBe('😀');
    expect(() => linkWhatsapp('5581999990000', 'x\ud800')).not.toThrow();
    const m = montarMensagem({
      empresa,
      cliente: { ...clientePf, nome: 'Jo\ud800ão' },
      itens: itensRevisados,
      total_centavos: 26000,
      observacao: 'obs\udc00',
    });
    expect(m).toContain('Jo�ão');
    expect(m).toContain('obs�');
    expect(() => linkWhatsapp('5581999990000', m)).not.toThrow();
  });

  it('texto com & # emoji e quebra de linha volta intacto', () => {
    const texto = '&#😀\nlinha 2';
    const url = linkWhatsapp('5581999990000', texto);
    expect(decodeURIComponent(url.split('?text=')[1])).toBe(texto);
    expect(url).not.toContain('\n');
  });
});
