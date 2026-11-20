import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErroApi } from '../../shared/services/api.js';
import { useFormulario } from '../../shared/hooks/useFormulario.js';
import { useToast } from '../../shared/hooks/useToast.js';
import { validarClientePedido } from '../../../supabase/functions/_shared/domain/clientePedido.js';
import { chaveDoItem } from '../services/carrinhoService.js';
import { dadosClienteService, IDENTIFICACAO_VAZIA } from '../services/dadosClienteService.js';
import { pedidoService } from '../services/pedidoService.js';
import { useCarrinho } from './useCarrinho.js';

export const MAX_OBSERVACAO = 500;
const STATUS_DIVERGENCIA = 409;
const PREFIXO_LINK_WHATSAPP = 'https://wa.me/';
const MSG_LINK_INVALIDO = 'Não foi possível preparar o pedido. Tente novamente em instantes.';
const MSG_PEDIDO_ENVIADO = 'Pedido enviado. Obrigado!';
const MSG_CONFIRA = 'Confira os campos destacados em vermelho.';
const STATUS_DADOS_INVALIDOS = 400;

// O servidor e o domínio chamam o CNPJ de `cpf_cnpj`; no formulário o campo é `cnpj`.
function errosParaFormulario({ cpf_cnpj: cnpj, ...demais } = {}) {
  return cnpj ? { ...demais, cnpj } : demais;
}

// Dados digitados -> corpo `cliente` do pedido (PF não leva razão social nem documento).
function clienteDoFormulario(valores) {
  const { tipo_pessoa: tipo, razao_social: razaoSocial, cnpj, ...contato } = valores;
  return tipo === 'PJ'
    ? { tipo_pessoa: tipo, ...contato, razao_social: razaoSocial, cnpj }
    : { tipo_pessoa: tipo, ...contato };
}

function precosDasDivergencias(divergencias) {
  return Object.fromEntries(
    divergencias
      .filter((d) => d.tipo === 'preco_mudou')
      .map((d) => [chaveDoItem(d.variacao_id, d.forma), d.preco_atual_centavos]),
  );
}

// Identifica o conteúdo do pedido: se mudar, o link do WhatsApp gerado antes deixa de valer.
function assinaturaDoPedido(itens, observacao, cliente) {
  const linhas = itens.map((i) => [i.chave, i.quantidade, i.preco_centavos]);
  return JSON.stringify([linhas, observacao, cliente]);
}

export function useFinalizarPedido() {
  const { itens, remover, atualizarPrecos, limpar } = useCarrinho();
  const { mostrar } = useToast();
  const navigate = useNavigate();
  const [revisao, setRevisao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [observacao, setObservacao] = useState('');
  const [pedidoPronto, setPedidoPronto] = useState(null);
  const [perguntandoEnvio, setPerguntandoEnvio] = useState(() =>
    pedidoService.confirmacaoPendente(),
  );
  const concluido = useRef(false);
  const [salvo] = useState(() => dadosClienteService.ler());
  const [temDadosSalvos, setTemDadosSalvos] = useState(salvo !== null);
  const [lembrar, setLembrar] = useState(salvo !== null);
  const identificacao = useFormulario(salvo ?? IDENTIFICACAO_VAZIA);
  const { valores, definirValores, setErros } = identificacao;

  const tratarFalha = useCallback(
    (erro) => {
      if (!(erro instanceof ErroApi)) throw erro;
      if (erro.status === STATUS_DIVERGENCIA && erro.dados) {
        setRevisao(erro.dados);
        return;
      }
      if (erro.status === STATUS_DADOS_INVALIDOS && erro.campos) {
        setErros(errosParaFormulario(erro.campos));
      }
      setAviso(erro.message);
    },
    [setErros],
  );

  const revisar = useCallback(
    async (itensParaRevisar) => {
      setCarregando(true);
      setAviso('');
      try {
        setRevisao(await pedidoService.revisar(itensParaRevisar));
      } catch (erro) {
        tratarFalha(erro);
      } finally {
        setCarregando(false);
      }
    },
    [tratarFalha],
  );

  const itensIniciais = useRef(itens);
  useEffect(() => {
    if (itensIniciais.current.length === 0) {
      if (!concluido.current) navigate('/carrinho', { replace: true });
      return;
    }
    revisar(itensIniciais.current);
  }, [navigate, revisar]);

  // Voltando do WhatsApp (outra aba ou app), pergunta de novo se o envio ainda está pendente.
  useEffect(() => {
    function aoVoltar() {
      if (document.visibilityState === 'visible' && pedidoService.confirmacaoPendente()) {
        setPerguntandoEnvio(true);
      }
    }
    document.addEventListener('visibilitychange', aoVoltar);
    return () => document.removeEventListener('visibilitychange', aoVoltar);
  }, []);

  // Aplica ao carrinho o que o servidor confirmou (preços novos, itens fora de venda) e revisa de novo.
  async function atualizarCarrinho() {
    const { divergencias } = revisao;
    const indisponiveis = new Set(
      divergencias
        .filter((d) => d.tipo === 'indisponivel')
        .map((d) => chaveDoItem(d.variacao_id, d.forma)),
    );
    atualizarPrecos(precosDasDivergencias(divergencias));
    indisponiveis.forEach(remover);
    const restantes = itens.filter((i) => !indisponiveis.has(i.chave));
    if (restantes.length === 0) {
      navigate('/carrinho', { replace: true });
      return;
    }
    await revisar(restantes);
  }

  // Pede o link ao servidor; quem abre o WhatsApp é o cliente, tocando no botão "Abrir WhatsApp".
  async function prepararEnvio() {
    setAviso('');
    // Conferência imediata no aparelho; o servidor continua sendo a autoridade.
    const conferido = validarClientePedido(clienteDoFormulario(valores));
    if (!conferido.ok) {
      setErros(errosParaFormulario(conferido.campos));
      setAviso(MSG_CONFIRA);
      return;
    }
    setErros({});
    setEnviando(true);
    try {
      const { link } = await pedidoService.enviar(itens, observacao, conferido.valor);
      if (typeof link !== 'string' || !link.startsWith(PREFIXO_LINK_WHATSAPP)) {
        setAviso(MSG_LINK_INVALIDO);
        return;
      }
      guardarOuEsquecerDados();
      setPedidoPronto({ link, assinatura: assinaturaDoPedido(itens, observacao, valores) });
    } catch (erro) {
      tratarFalha(erro);
    } finally {
      setEnviando(false);
    }
  }

  // Só depois de o pedido ser preparado: marcado, guarda neste aparelho; desmarcado, apaga o que havia.
  function guardarOuEsquecerDados() {
    if (lembrar) {
      setTemDadosSalvos(dadosClienteService.salvar(valores));
    } else {
      dadosClienteService.esquecer();
      setTemDadosSalvos(false);
    }
  }

  function esquecerDados() {
    dadosClienteService.esquecer();
    definirValores(IDENTIFICACAO_VAZIA);
    setErros({});
    setLembrar(false);
    setTemDadosSalvos(false);
  }

  function mudarTipo(tipo) {
    identificacao.mudar('tipo_pessoa', tipo);
    setErros({});
  }

  function aoAbrirWhatsapp() {
    pedidoService.marcarConfirmacaoPendente();
    setPerguntandoEnvio(true);
  }

  function confirmarEnvio() {
    concluido.current = true;
    pedidoService.limparConfirmacaoPendente();
    setPerguntandoEnvio(false);
    limpar();
    mostrar({ texto: MSG_PEDIDO_ENVIADO });
    navigate('/', { replace: true });
  }

  function manterCarrinho() {
    pedidoService.limparConfirmacaoPendente();
    setPerguntandoEnvio(false);
  }

  const temDivergencia = (revisao?.divergencias.length ?? 0) > 0;
  const linkValido = pedidoPronto?.assinatura === assinaturaDoPedido(itens, observacao, valores);
  return {
    itensDoCarrinho: itens,
    revisao,
    carregando,
    enviando,
    aviso,
    observacao,
    setObservacao,
    identificacao: { valores, erros: identificacao.erros, mudar: identificacao.mudar, mudarTipo },
    lembrar,
    setLembrar,
    temDadosSalvos,
    esquecerDados,
    temDivergencia,
    linkDoWhatsapp: linkValido && !temDivergencia ? pedidoPronto.link : null,
    perguntandoEnvio,
    aoAbrirWhatsapp,
    manterCarrinho,
    confirmarEnvio,
    atualizarCarrinho,
    prepararEnvio,
    tentarNovamente: () => revisar(itens),
  };
}
