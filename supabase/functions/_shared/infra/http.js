// Infra HTTP das Edge Functions: CORS, método, corpo JSON e envelope { ok, dados | erro }.
const LIMITE_CORPO_BYTES = 100 * 1024;
const MSG_GRANDE = 'Requisição grande demais.';
const MSG_INVALIDA = 'Requisição inválida.';

export class ErroHttp extends Error {
  // `dados` é opcional: carga extra enviada junto do erro (ex.: divergências de um pedido).
  constructor(status, erro, campos, dados) {
    super(erro);
    this.status = status;
    this.erro = erro;
    this.campos = campos;
    this.dados = dados;
  }
}

export function falhar(status, erro, campos, dados) {
  throw new ErroHttp(status, erro, campos, dados);
}

// Marca o retorno de sucesso; `servir` converte em `200 { ok: true, dados }`.
export function responder(dados) {
  return { __resposta: true, dados };
}

function origensPermitidas() {
  return (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export function cabecalhos(req) {
  const h = {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  };
  const origem = req.headers.get('origin');
  if (origem && origensPermitidas().includes(origem)) {
    h['Access-Control-Allow-Origin'] = origem;
    h['Access-Control-Allow-Headers'] = 'authorization, content-type, apikey';
    h['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    h['Access-Control-Max-Age'] = '600';
  }
  return h;
}

function json(req, status, corpo, extra = {}) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cabecalhos(req), ...extra },
  });
}

// Lê o corpo aos poucos e aborta assim que passa do limite (não confia em Content-Length).
async function lerBytes(req, limite) {
  const declarado = Number(req.headers.get('content-length'));
  if (declarado > limite) throw new ErroHttp(413, MSG_GRANDE);
  if (!req.body) return new Uint8Array(0);
  const leitor = req.body.getReader();
  const partes = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.byteLength;
    if (total > limite) {
      await leitor.cancel().catch(() => {});
      throw new ErroHttp(413, MSG_GRANDE);
    }
    partes.push(value);
  }
  const bytes = new Uint8Array(total);
  let pos = 0;
  for (const p of partes) {
    bytes.set(p, pos);
    pos += p.byteLength;
  }
  return bytes;
}

const tipoDe = (req) => (req.headers.get('content-type') ?? '').toLowerCase();

async function lerCorpo(req) {
  if (!tipoDe(req).includes('application/json')) throw new ErroHttp(400, MSG_INVALIDA);
  const texto = new TextDecoder().decode(await lerBytes(req, LIMITE_CORPO_BYTES));
  try {
    const corpo = JSON.parse(texto);
    if (corpo === null || typeof corpo !== 'object' || Array.isArray(corpo)) throw new Error();
    return corpo;
  } catch {
    throw new ErroHttp(400, MSG_INVALIDA);
  }
}

// Lê um corpo multipart já limitado em bytes e o interpreta como FormData.
async function lerFormData(req, limite) {
  const bytes = await lerBytes(req, limite);
  const copia = new Request(req.url, {
    method: 'POST',
    headers: { 'content-type': req.headers.get('content-type') },
    body: bytes,
  });
  try {
    return await copia.formData();
  } catch {
    throw new ErroHttp(400, MSG_INVALIDA);
  }
}

// Trata uma requisição; separado de `servir` para poder ser chamado diretamente.
// Opções (padrão: só JSON até 100 KB):
//   aceitarMultipart: aceita `multipart/form-data`; o handler recebe `corpo = null` e
//     `contexto = { multipart: true, formData() }`. O corpo só é lido quando o handler chama
//     `formData()` (assim ele pode autenticar antes), sempre com o limite `limiteBytes`.
export async function tratar(req, handler, opcoes = {}) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cabecalhos(req) });
  }
  if (req.method !== 'POST') {
    return json(req, 405, { ok: false, erro: 'Método não permitido.' }, { Allow: 'POST, OPTIONS' });
  }
  try {
    const multipart =
      Boolean(opcoes.aceitarMultipart) && tipoDe(req).includes('multipart/form-data');
    const corpo = multipart ? null : await lerCorpo(req);
    const contexto = {
      multipart,
      formData: () => lerFormData(req, opcoes.limiteBytes ?? LIMITE_CORPO_BYTES),
    };
    const resultado = await handler(req, corpo, contexto);
    const dados = resultado?.__resposta ? resultado.dados : resultado;
    return json(req, 200, { ok: true, dados: dados ?? null });
  } catch (e) {
    if (e instanceof ErroHttp) {
      const corpo = { ok: false, erro: e.erro };
      if (e.campos) corpo.campos = e.campos;
      if (e.dados !== undefined) corpo.dados = e.dados;
      return json(req, e.status, corpo);
    }
    console.error(e);
    return json(req, 500, { ok: false, erro: 'Erro inesperado. Tente novamente.' });
  }
}

export function servir(handler, opcoes) {
  Deno.serve((req) => tratar(req, handler, opcoes));
}
