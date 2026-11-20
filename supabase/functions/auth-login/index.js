import { db } from '../_shared/infra/db.js';
import { ErroHttp, falhar, servir } from '../_shared/infra/http.js';
import {
  marcarSucesso,
  registrarTentativa,
  removerTentativa,
  verificarLimite,
} from '../_shared/infra/rateLimitRepo.js';
import { ipDaRequisicao, normalizarEmail } from '../_shared/domain/rateLimit.js';
import {
  MSG_CREDENCIAIS,
  MSG_INDISPONIVEL,
  PAINEIS,
  STATUS_INDISPONIVEL,
  autenticar,
  descartarSessao,
  montarResposta,
  perfilAdmin,
} from '../_shared/infra/sessaoUsuario.js';

const ACAO = 'login';
const MSG_BLOQUEADO = 'Muitas tentativas. Tente novamente em alguns minutos.';

// Falha fechada: se não der para consultar o limite, não tenta o login.
async function exigirDentroDoLimite(ip, email) {
  let limite;
  try {
    limite = await verificarLimite(db(), { ip, email, acao: ACAO });
  } catch (e) {
    console.error(e);
    falhar(503, MSG_INDISPONIVEL);
  }
  if (limite.bloqueado) falhar(429, MSG_BLOQUEADO);
}

function recusar() {
  falhar(401, MSG_CREDENCIAIS);
}

// Se não der para confirmar o sucesso, o usuário já autenticado entra mesmo assim.
async function confirmarSucesso(idTentativa) {
  try {
    await marcarSucesso(db(), idTentativa);
  } catch (e) {
    console.error(e);
  }
}

// GoTrue limitando ou fora do ar: a tentativa pré-registrada não é falha do usuário, então sai
// da contagem (assim o limite do site não bloqueia por culpa do serviço).
async function autenticarSemPenalizar(email, senha, idTentativa) {
  try {
    return await autenticar(email, senha);
  } catch (e) {
    if (e instanceof ErroHttp && e.status === STATUS_INDISPONIVEL) {
      await removerTentativaSemFalhar(idTentativa);
    }
    throw e;
  }
}

async function removerTentativaSemFalhar(idTentativa) {
  try {
    await removerTentativa(db(), idTentativa);
  } catch (e) {
    console.error(e);
  }
}

servir(async (req, corpo) => {
  const { senha, painel } = corpo;
  const email = normalizarEmail(corpo.email);
  if (!PAINEIS.includes(painel)) falhar(400, 'Painel inválido.');
  if (!email || typeof senha !== 'string' || !senha) falhar(400, 'Informe e-mail e senha.');

  const ip = ipDaRequisicao(req);
  await exigirDentroDoLimite(ip, email);

  // Registra como falha ANTES de autenticar: requisições paralelas já enxergam a tentativa.
  const idTentativa = await registrarTentativa(db(), { ip, email, sucesso: false, acao: ACAO });

  const autenticado = await autenticarSemPenalizar(email, senha, idTentativa);
  if (!autenticado) return recusar();

  const perfil = await perfilAdmin(autenticado.user);
  if (!perfil) {
    await descartarSessao(autenticado.sessao);
    return recusar();
  }

  await confirmarSucesso(idTentativa);
  return montarResposta(autenticado.sessao, autenticado.user, perfil);
});
