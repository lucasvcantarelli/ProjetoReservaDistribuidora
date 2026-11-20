const MSG_REDE = 'Não foi possível conectar. Verifique sua internet.';
const MSG_RESPOSTA = 'Resposta inesperada do servidor. Tente novamente.';
const MSG_SESSAO = 'Sessão expirada. Faça login novamente.';
const STATUS_SEM_REDE = 0;
const STATUS_NAO_AUTORIZADO = 401;
const STATUS_REFRESH_RECUSADO = [400, 401];
const FUNCAO_REFRESH = 'auth-refresh';

export class ErroApi extends Error {
  constructor(mensagem, { status = STATUS_SEM_REDE, campos, dados } = {}) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
    this.campos = campos;
    this.dados = dados;
  }
}

async function enviar(baseUrl, funcao, { corpo, formData, token }) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!formData) headers['Content-Type'] = 'application/json';

  let resposta;
  try {
    resposta = await fetch(`${baseUrl}/${funcao}`, {
      method: 'POST',
      headers,
      body: formData ?? JSON.stringify(corpo ?? {}),
    });
  } catch {
    throw new ErroApi(MSG_REDE, { status: STATUS_SEM_REDE });
  }

  let json;
  try {
    json = await resposta.json();
  } catch {
    throw new ErroApi(MSG_RESPOSTA, { status: resposta.status });
  }
  if (resposta.ok && json?.ok) return json.dados;
  throw new ErroApi(json?.erro || MSG_RESPOSTA, {
    status: resposta.status,
    campos: json?.campos,
    dados: json?.dados,
  });
}

// Cliente HTTP das Edge Functions. Em 401, renova a sessão uma única vez (compartilhando a renovação
// entre chamadas simultâneas) e repete a chamada; se a renovação falhar, encerra a sessão local.
// `sessao` é opcional: sem ela (loja pública) nenhuma chamada leva token nem tenta renovar.
export function criarApi(sessao = null, { baseUrl = import.meta.env.VITE_FUNCTIONS_URL } = {}) {
  let renovacaoEmAndamento = null;

  function tokenAtual() {
    return sessao?.obter()?.sessao.access_token;
  }

  async function renovar() {
    const atual = sessao.obter();
    try {
      const dados = await enviar(baseUrl, FUNCAO_REFRESH, {
        corpo: { refresh_token: atual.sessao.refresh_token },
      });
      sessao.atualizarSessao(dados.sessao);
    } catch (erro) {
      // Só a recusa explícita do servidor encerra a sessão; falha de rede ou 5xx mantém.
      if (!STATUS_REFRESH_RECUSADO.includes(erro.status)) throw erro;
      sessao.limpar();
      throw new ErroApi(MSG_SESSAO, { status: STATUS_NAO_AUTORIZADO });
    }
  }

  function renovarCompartilhado() {
    renovacaoEmAndamento ??= renovar().finally(() => {
      renovacaoEmAndamento = null;
    });
    return renovacaoEmAndamento;
  }

  async function tratarNaoAutorizado(erro, tokenUsado, repetir) {
    const atual = sessao.obter();
    if (erro.status !== STATUS_NAO_AUTORIZADO || !atual?.sessao.refresh_token) throw erro;
    // Outra chamada já renovou enquanto esta esperava: basta repetir com o token novo.
    if (atual.sessao.access_token === tokenUsado) await renovarCompartilhado();
    return repetir(tokenAtual());
  }

  async function chamar(funcao, corpo, { autenticado = false, formData } = {}) {
    const tentar = (token) => enviar(baseUrl, funcao, { corpo, formData, token });
    if (!autenticado || !sessao) return tentar(undefined);

    const tokenUsado = tokenAtual();
    try {
      return await tentar(tokenUsado);
    } catch (erro) {
      if (!(erro instanceof ErroApi)) throw erro;
      return tratarNaoAutorizado(erro, tokenUsado, tentar);
    }
  }

  return { chamar };
}
