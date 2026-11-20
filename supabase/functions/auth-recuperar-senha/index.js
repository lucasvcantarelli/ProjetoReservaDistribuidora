import { clienteDescartavel, db } from '../_shared/infra/db.js';
import { emailEhDeAdmin } from '../_shared/infra/auth.js';
import { falhar, servir } from '../_shared/infra/http.js';
import { registrarTentativa, verificarLimite } from '../_shared/infra/rateLimitRepo.js';
import { ipDaRequisicao, normalizarEmail } from '../_shared/domain/rateLimit.js';

const ACAO = 'recuperar';
const MSG_RESPOSTA = 'Se o e-mail estiver cadastrado, você receberá um link.';
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Só envia dentro do limite; qualquer problema vira "não envia", sem mudar a resposta.
// A tentativa é registrada para todo e-mail (admin ou não), então o limite não revela quem é admin.
async function podeEnviar(ip, email) {
  try {
    const limite = await verificarLimite(db(), { ip, email, acao: ACAO });
    await registrarTentativa(db(), { ip, email, sucesso: true, acao: ACAO });
    return !limite.bloqueado;
  } catch (e) {
    console.error(e);
    return false;
  }
}

// Só administradores têm conta: e-mail de outra pessoa nunca recebe link (resposta idêntica).
async function ehEmailDeAdmin(email) {
  try {
    return await emailEhDeAdmin(email);
  } catch (e) {
    console.error(e);
    return false;
  }
}

async function enviarLink(email) {
  // O link leva ao painel admin (caminho escondido), que é onde a nova senha é definida.
  const adminUrl = (Deno.env.get('ADMIN_URL') ?? '').replace(/\/+$/, '');
  if (!adminUrl) {
    console.error('ADMIN_URL não configurada: e-mail de recuperação não enviado.');
    return;
  }
  const { error } = await clienteDescartavel().auth.resetPasswordForEmail(email, {
    redirectTo: `${adminUrl}/nova-senha`,
  });
  if (error) console.error(error.message);
}

// O envio do e-mail é lento; não é aguardado, para que admin e não-admin respondam no mesmo tempo
// (senão o tempo de resposta revelaria quem é admin). `EdgeRuntime.waitUntil` mantém a função viva
// até terminar; sem ele (ex.: testes), segue em segundo plano com o erro registrado em log.
function enviarEmSegundoPlano(email) {
  const tarefa = enviarLink(email).catch((e) => console.error(e));
  if (typeof EdgeRuntime !== 'undefined' && typeof EdgeRuntime.waitUntil === 'function') {
    EdgeRuntime.waitUntil(tarefa);
  }
}

servir(async (req, corpo) => {
  const email = normalizarEmail(corpo.email);
  if (!email || !REGEX_EMAIL.test(email)) falhar(400, 'Informe um e-mail válido.');
  if ((await podeEnviar(ipDaRequisicao(req), email)) && (await ehEmailDeAdmin(email))) {
    enviarEmSegundoPlano(email);
  }
  return MSG_RESPOSTA;
});
