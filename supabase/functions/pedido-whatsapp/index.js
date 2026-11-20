import { db } from '../_shared/infra/db.js';
import { falhar, servir } from '../_shared/infra/http.js';
import { registrarTentativa, verificarLimite } from '../_shared/infra/rateLimitRepo.js';
import { revisarCarrinho } from '../_shared/infra/pedidoRepo.js';
import { validarClientePedido } from '../_shared/domain/clientePedido.js';
import { linkWhatsapp, montarMensagem } from '../_shared/domain/pedido.js';
import { ipDaRequisicao } from '../_shared/domain/rateLimit.js';

const ACAO = 'pedido';
const MAX_OBSERVACAO = 500;
const MSG_OBSERVACAO = `A observação deve ter no máximo ${MAX_OBSERVACAO} caracteres.`;
const MSG_MUDOU = 'Alguns itens mudaram. Revise o carrinho.';
const MSG_SEM_WHATSAPP = 'A empresa ainda não configurou o WhatsApp.';
const MSG_LIMITE = 'Muitos pedidos em pouco tempo. Tente novamente mais tarde.';
const MSG_INDISPONIVEL = 'Serviço indisponível. Tente novamente em instantes.';
const MSG_CLIENTE = 'Confira seus dados.';

function validarObservacao(valor) {
  if (valor === undefined || valor === null) return '';
  if (typeof valor !== 'string' || valor.length > MAX_OBSERVACAO) falhar(400, MSG_OBSERVACAO);
  return valor;
}

async function carregarEmpresa() {
  const { data, error } = await db()
    .from('config_empresa')
    .select('nome, whatsapp, rodape_mensagem')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// Falha fechada: se não der para consultar o limite, não gera o pedido.
async function exigirDentroDoLimite(ip) {
  let limite;
  try {
    limite = await verificarLimite(db(), { ip, acao: ACAO });
  } catch (e) {
    console.error(e);
    falhar(503, MSG_INDISPONIVEL);
  }
  if (limite.bloqueado) falhar(429, MSG_LIMITE);
}

// Só IP e instante: nenhum dado do cliente ou do pedido é guardado.
async function registrar(ip) {
  try {
    await registrarTentativa(db(), { ip, sucesso: true, acao: ACAO });
  } catch (e) {
    console.error(e);
    falhar(503, MSG_INDISPONIVEL);
  }
}

servir(async (req, corpo) => {
  const ip = ipDaRequisicao(req);
  await exigirDentroDoLimite(ip);
  await registrar(ip);

  const observacao = validarObservacao(corpo.observacao);
  const cliente = validarClientePedido(corpo.cliente);
  if (!cliente.ok) falhar(400, MSG_CLIENTE, cliente.campos);
  const revisao = await revisarCarrinho(corpo);
  if (revisao.divergencias.length > 0) falhar(409, MSG_MUDOU, undefined, revisao);

  const empresa = await carregarEmpresa();
  if (!empresa?.whatsapp?.trim()) falhar(503, MSG_SEM_WHATSAPP);

  const mensagem = montarMensagem({
    empresa,
    cliente: cliente.valor,
    itens: revisao.itens,
    total_centavos: revisao.total_centavos,
    observacao,
  });
  return { link: linkWhatsapp(empresa.whatsapp, mensagem) };
});
