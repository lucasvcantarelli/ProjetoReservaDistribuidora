import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderizarLoja } from '../../../test/renderizarLoja.jsx';
import { ErroApi } from '../../../shared/services/api.js';
import { carrinhoService } from '../../services/carrinhoService.js';
import { CHAVE_DADOS_CLIENTE, dadosClienteService } from '../../services/dadosClienteService.js';
import { pedidoService } from '../../services/pedidoService.js';
import { cepService } from '../../../shared/services/cepService.js';

const LINK = 'https://wa.me/5511999999999?text=oi';
const BOTAO_PREPARAR = 'Preparar pedido';
const LEMBRAR = 'Lembrar meus dados neste aparelho';
const CNPJ_VALIDO = '11222333000181';
const ITEM = {
  variacao_id: 'v1',
  forma: 'unidade',
  quantidade: 2,
  produto_id: 'p1',
  produto_nome: 'Copo descartável',
  nome_tamanho: 'M',
  preco_centavos: 100,
  foto_url: null,
};
const REVISAO_OK = {
  itens: [
    {
      variacao_id: 'v1',
      forma: 'unidade',
      quantidade: 2,
      produto_nome: 'Copo descartável',
      nome_tamanho: 'M',
      preco_centavos: 100,
      subtotal_centavos: 200,
    },
  ],
  divergencias: [],
  total_centavos: 200,
};
const CONTATO = {
  Nome: 'Ana Souza',
  'Telefone com DDD': '11999998888',
  CEP: '01310100',
  Rua: 'Avenida Paulista',
  Número: '1000',
  Bairro: 'Bela Vista',
  Cidade: 'São Paulo',
};
const SALVO_PF = {
  tipo_pessoa: 'PF',
  razao_social: '',
  cnpj: '',
  nome: 'Ana Souza',
  telefone: '(11) 99999-8888',
  cep: '01310-100',
  uf: 'SP',
  rua: 'Avenida Paulista',
  numero: '1000',
  complemento: '',
  bairro: 'Bela Vista',
  cidade: 'São Paulo',
};

async function abrir({ enviar } = {}) {
  carrinhoService.adicionar(ITEM);
  vi.spyOn(pedidoService, 'revisar').mockResolvedValue(REVISAO_OK);
  const espiaEnviar = vi
    .spyOn(pedidoService, 'enviar')
    .mockImplementation(enviar ?? (() => Promise.resolve({ link: LINK })));
  renderizarLoja('/finalizar');
  await screen.findByRole('button', { name: BOTAO_PREPARAR });
  return espiaEnviar;
}

async function preencherContato() {
  for (const [rotulo, texto] of Object.entries(CONTATO)) {
    const campo = screen.queryByLabelText(rotulo) ?? screen.getByLabelText('Nome do responsável');
    await userEvent.type(campo, texto);
  }
  await userEvent.selectOptions(screen.getByLabelText('UF'), 'SP');
}

const preparar = () => userEvent.click(screen.getByRole('button', { name: BOTAO_PREPARAR }));
const escolherEmpresa = () => userEvent.click(screen.getByLabelText('Empresa'));
const recusar = (erro) => () => Promise.reject(erro);

describe('Finalizar - identificação do cliente', () => {
  it('funciona sem login e sem nenhuma chamada de autenticação ou conta', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      const dados = String(url).endsWith('pedido-revisar') ? REVISAO_OK : { link: LINK };
      return Promise.resolve(new Response(JSON.stringify({ ok: true, dados }), { status: 200 }));
    });
    carrinhoService.adicionar(ITEM);
    renderizarLoja('/finalizar');
    await screen.findByRole('button', { name: BOTAO_PREPARAR });
    await preencherContato();
    await preparar();
    expect(await screen.findByRole('link', { name: 'Abrir WhatsApp' })).toHaveAttribute(
      'href',
      LINK,
    );
    const chamadas = fetchMock.mock.calls.filter(([url]) => !String(url).includes('viacep'));
    const funcoes = chamadas.map(([url]) => String(url).split('/').pop());
    expect(funcoes).toEqual(['pedido-revisar', 'pedido-whatsapp']);
    expect(chamadas.every(([, init]) => !init.headers.Authorization)).toBe(true);
    const corpoEnviado = JSON.parse(chamadas[1][1].body);
    expect(corpoEnviado.cliente).toMatchObject({ tipo_pessoa: 'PF', nome: 'Ana Souza' });
  });

  it('pessoa física não vê CPF, CNPJ, razão social, senha nem e-mail', async () => {
    await abrir();
    expect(screen.getByLabelText('Pessoa física')).toBeChecked();
    expect(screen.queryByLabelText(/CPF/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('CNPJ')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Razão social')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/senha|e-mail/i)).not.toBeInTheDocument();
  });

  it('empresa mostra razão social e CNPJ com máscara e envia o corpo de PJ', async () => {
    const enviar = await abrir();
    await escolherEmpresa();
    await userEvent.type(screen.getByLabelText('Razão social'), 'Bar do Zé Ltda');
    await userEvent.type(screen.getByLabelText('CNPJ'), CNPJ_VALIDO);
    expect(screen.getByLabelText('CNPJ')).toHaveValue('11.222.333/0001-81');
    expect(screen.getByLabelText('Nome do responsável')).toBeInTheDocument();
    await preencherContato();
    await preparar();
    await screen.findByRole('link', { name: 'Abrir WhatsApp' });
    expect(enviar.mock.calls[0][2]).toMatchObject({
      tipo_pessoa: 'PJ',
      razao_social: 'Bar do Zé Ltda',
      cpf_cnpj: CNPJ_VALIDO,
    });
  });

  it('CNPJ inválido de empresa: erro sob o campo, foco nele e nenhuma chamada ao servidor', async () => {
    const enviar = await abrir();
    await escolherEmpresa();
    await userEvent.type(screen.getByLabelText('Razão social'), 'Bar do Zé Ltda');
    await userEvent.type(screen.getByLabelText('CNPJ'), '11222333000182');
    await preencherContato();
    await preparar();
    expect(await screen.findByText('Informe um CNPJ válido.')).toBeInTheDocument();
    expect(screen.getByLabelText('CNPJ')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('CNPJ')).toHaveFocus();
    expect(enviar).not.toHaveBeenCalled();
  });

  it('campos vazios mostram erros e focam o primeiro inválido sem chamar o servidor', async () => {
    const enviar = await abrir();
    await preparar();
    expect(await screen.findByText('Informe o nome.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveFocus();
    expect(screen.getByRole('alert')).toHaveTextContent('Confira os campos');
    expect(enviar).not.toHaveBeenCalled();
  });

  it('400 do servidor com campos mostra cada erro sob o campo e foca o primeiro', async () => {
    await abrir({
      enviar: recusar(
        new ErroApi('Confira os dados informados.', {
          status: 400,
          campos: { telefone: 'Telefone do servidor.', cidade: 'Cidade do servidor.' },
        }),
      ),
    });
    await preencherContato();
    await preparar();
    expect(await screen.findByText('Telefone do servidor.')).toBeInTheDocument();
    expect(screen.getByText('Cidade do servidor.')).toBeInTheDocument();
    expect(screen.getByLabelText('Telefone com DDD')).toHaveFocus();
    expect(screen.getByRole('alert')).toHaveTextContent('Confira os dados informados.');
  });

  it('400 em cpf_cnpj aparece sob o campo CNPJ', async () => {
    await abrir({
      enviar: recusar(
        new ErroApi('Confira os dados informados.', {
          status: 400,
          campos: { cpf_cnpj: 'CNPJ do servidor.' },
        }),
      ),
    });
    await escolherEmpresa();
    await userEvent.type(screen.getByLabelText('Razão social'), 'Bar do Zé Ltda');
    await userEvent.type(screen.getByLabelText('CNPJ'), CNPJ_VALIDO);
    await preencherContato();
    await preparar();
    expect(await screen.findByText('CNPJ do servidor.')).toBeInTheDocument();
    expect(screen.getByLabelText('CNPJ')).toHaveFocus();
  });

  it('429 mostra a mensagem de excesso de pedidos e não gera o link', async () => {
    await abrir({
      enviar: recusar(
        new ErroApi('Muitos pedidos em pouco tempo. Tente novamente mais tarde.', { status: 429 }),
      ),
    });
    await preencherContato();
    await preparar();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Muitos pedidos em pouco tempo. Tente novamente mais tarde.',
    );
    expect(screen.queryByRole('link', { name: 'Abrir WhatsApp' })).not.toBeInTheDocument();
  });

  it('mudar os dados depois de preparar descarta o link', async () => {
    await abrir();
    await preencherContato();
    await preparar();
    await screen.findByRole('link', { name: 'Abrir WhatsApp' });
    await userEvent.type(screen.getByLabelText('Complemento (opcional)'), 'Sala 2');
    expect(screen.queryByRole('link', { name: 'Abrir WhatsApp' })).not.toBeInTheDocument();
  });
});

describe('Finalizar - lembrar meus dados', () => {
  it('vem desmarcado, sem "Esquecer", e não guarda nada se continuar desmarcado', async () => {
    await abrir();
    expect(screen.getByLabelText(LEMBRAR)).not.toBeChecked();
    expect(screen.queryByRole('button', { name: 'Esquecer meus dados' })).not.toBeInTheDocument();
    await preencherContato();
    await preparar();
    await screen.findByRole('link', { name: 'Abrir WhatsApp' });
    expect(window.localStorage.getItem(CHAVE_DADOS_CLIENTE)).toBeNull();
  });

  it('marcado: guarda ao preparar com sucesso e oferece "Esquecer meus dados"', async () => {
    await abrir();
    await preencherContato();
    await userEvent.click(screen.getByLabelText(LEMBRAR));
    await preparar();
    await screen.findByRole('link', { name: 'Abrir WhatsApp' });
    expect(dadosClienteService.ler()).toMatchObject({ nome: 'Ana Souza', uf: 'SP' });
    expect(screen.getByRole('button', { name: 'Esquecer meus dados' })).toBeInTheDocument();
  });

  it('marcado mas com falha do servidor: não guarda nada', async () => {
    await abrir({ enviar: recusar(new ErroApi('Falhou.', { status: 503 })) });
    await preencherContato();
    await userEvent.click(screen.getByLabelText(LEMBRAR));
    await preparar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Falhou.');
    expect(window.localStorage.getItem(CHAVE_DADOS_CLIENTE)).toBeNull();
  });

  it('com dados salvos: vem preenchido e marcado; desmarcar e preparar apaga o que havia', async () => {
    dadosClienteService.salvar(SALVO_PF);
    await abrir();
    expect(screen.getByLabelText('Nome')).toHaveValue('Ana Souza');
    expect(screen.getByLabelText('Telefone com DDD')).toHaveValue('(11) 99999-8888');
    expect(screen.getByLabelText('UF')).toHaveValue('SP');
    expect(screen.getByLabelText(LEMBRAR)).toBeChecked();
    await userEvent.click(screen.getByLabelText(LEMBRAR));
    await preparar();
    await screen.findByRole('link', { name: 'Abrir WhatsApp' });
    expect(window.localStorage.getItem(CHAVE_DADOS_CLIENTE)).toBeNull();
  });

  it('"Esquecer meus dados" limpa o armazenamento, o formulário e desmarca', async () => {
    dadosClienteService.salvar(SALVO_PF);
    await abrir();
    await userEvent.click(screen.getByRole('button', { name: 'Esquecer meus dados' }));
    expect(window.localStorage.getItem(CHAVE_DADOS_CLIENTE)).toBeNull();
    expect(screen.getByLabelText('Nome')).toHaveValue('');
    expect(screen.getByLabelText('UF')).toHaveValue('');
    expect(screen.getByLabelText(LEMBRAR)).not.toBeChecked();
    expect(screen.queryByRole('button', { name: 'Esquecer meus dados' })).not.toBeInTheDocument();
  });

  it.each([
    ['JSON inválido', '{quebrado'],
    ['formato antigo', JSON.stringify({ nome: 'Ana' })],
    ['campo com tipo errado', JSON.stringify({ v: 1, dados: { ...SALVO_PF, nome: 42 } })],
    ['versão desconhecida', JSON.stringify({ v: 99, dados: SALVO_PF })],
  ])('armazenamento corrompido (%s): abre vazio e apaga a chave', async (_, bruto) => {
    window.localStorage.setItem(CHAVE_DADOS_CLIENTE, bruto);
    await abrir();
    expect(screen.getByLabelText('Nome')).toHaveValue('');
    expect(screen.getByLabelText(LEMBRAR)).not.toBeChecked();
    expect(window.localStorage.getItem(CHAVE_DADOS_CLIENTE)).toBeNull();
  });
});

describe('Finalizar - endereço pelo CEP', () => {
  const ENDERECO = { rua: 'Praça da Sé', bairro: 'Sé', cidade: 'São Paulo', uf: 'SP' };

  it('digitar o CEP preenche rua, bairro, cidade e UF, que continuam editáveis', async () => {
    const buscar = vi.spyOn(cepService, 'buscar').mockResolvedValue(ENDERECO);
    await abrir();
    await userEvent.type(screen.getByLabelText('CEP'), '01001000');
    expect(await screen.findByDisplayValue('Praça da Sé')).toBeInTheDocument();
    expect(buscar).toHaveBeenCalledWith('01001000');
    expect(screen.getByLabelText('Bairro')).toHaveValue('Sé');
    expect(screen.getByLabelText('Cidade')).toHaveValue('São Paulo');
    expect(screen.getByLabelText('UF')).toHaveValue('SP');
    await userEvent.clear(screen.getByLabelText('Rua'));
    await userEvent.type(screen.getByLabelText('Rua'), 'Rua do Carmo');
    expect(screen.getByLabelText('Rua')).toHaveValue('Rua do Carmo');
  });

  it('CEP não encontrado avisa e deixa digitar o endereço', async () => {
    vi.spyOn(cepService, 'buscar').mockResolvedValue(null);
    await abrir();
    await userEvent.type(screen.getByLabelText('CEP'), '99999999');
    expect(
      await screen.findByText('Não conseguimos buscar o endereço desse CEP. Preencha abaixo.'),
    ).toBeInTheDocument();
  });

  it('dados lembrados neste aparelho não disparam a busca nem mudam o endereço', async () => {
    const buscar = vi.spyOn(cepService, 'buscar').mockResolvedValue(ENDERECO);
    dadosClienteService.salvar(SALVO_PF);
    await abrir();
    expect(screen.getByLabelText('Rua')).toHaveValue('Avenida Paulista');
    expect(buscar).not.toHaveBeenCalled();
  });
});
