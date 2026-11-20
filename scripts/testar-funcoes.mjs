// Testes de integração das Edge Functions (sem framework).
//
// Como rodar:
//   1) npx supabase start                      (banco local)
//   2) npx supabase functions serve            (em outro terminal)
//   3) eval "$(npx supabase status -o env | sed 's/^/export /')"   # bash; define API_URL, SERVICE_ROLE_KEY...
//      node scripts/testar-funcoes.mjs
//
// Variáveis lidas do ambiente: API_URL (ou SUPABASE_URL), SERVICE_ROLE_KEY, ANON_KEY (opcional).
// O script cria seus próprios dados via REST com a service role e os remove ao final.
// Para adicionar casos (Task 10): inclua `{ nome, executar }` em `casos`.

const API_URL = process.env.API_URL || process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const ORIGEM_OK = process.env.ORIGEM_PERMITIDA || 'http://localhost:5173';
const FUNCOES = `${API_URL}/functions/v1`;

if (!SERVICE_ROLE_KEY) {
  console.error('Defina SERVICE_ROLE_KEY (npx supabase status -o env).');
  process.exit(2);
}

// ---------- helpers ----------

export async function chamar(funcao, corpo, { metodo = 'POST', headers = {}, bruto } = {}) {
  const init = { method: metodo, headers: { 'Content-Type': 'application/json', ...headers } };
  if (metodo !== 'GET' && metodo !== 'HEAD') {
    init.body = bruto !== undefined ? bruto : JSON.stringify(corpo ?? {});
  }
  const resposta = await fetch(`${FUNCOES}/${funcao}`, init);
  const texto = await resposta.text();
  let json = null;
  try {
    json = JSON.parse(texto);
  } catch {
    /* corpo não JSON */
  }
  return { status: resposta.status, headers: resposta.headers, json, texto };
}

async function rest(caminho, { metodo = 'GET', corpo } = {}) {
  const resposta = await fetch(`${API_URL}/rest/v1/${caminho}`, {
    method: metodo,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await resposta.text();
  if (!resposta.ok) throw new Error(`REST ${metodo} ${caminho} -> ${resposta.status}: ${texto}`);
  return texto ? JSON.parse(texto) : null;
}

export function afirmar(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

export function igual(obtido, esperado, rotulo) {
  if (obtido !== esperado) {
    throw new Error(
      `${rotulo}: esperado ${JSON.stringify(esperado)}, obtido ${JSON.stringify(obtido)}`,
    );
  }
}

async function authAdmin(caminho, { metodo = 'GET', corpo } = {}) {
  const resposta = await fetch(`${API_URL}/auth/v1/admin/${caminho}`, {
    method: metodo,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await resposta.text();
  if (!resposta.ok) throw new Error(`AUTH ${metodo} ${caminho} -> ${resposta.status}: ${texto}`);
  return texto ? JSON.parse(texto) : null;
}

// ---------- dados de teste ----------

const sufixo = Date.now().toString(36);
const dados = {};
const SENHA = 'Senha-teste-123';
const emailDe = (rotulo) => `teste-${rotulo}-${sufixo}@example.com`;

// CPF/CNPJ válidos e únicos por execução (dígitos verificadores calculados).
function digitoVerificador(base, pesos) {
  const soma = base.reduce((acc, d, i) => acc + d * pesos[i], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function gerarCpf(semente) {
  const base = String(semente).padStart(9, '0').slice(-9).split('').map(Number);
  base.push(digitoVerificador(base, [10, 9, 8, 7, 6, 5, 4, 3, 2]));
  base.push(digitoVerificador(base, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]));
  return base.join('');
}

// Semente a partir do relógio: evita colidir com CPFs de execuções anteriores.
const SEMENTE_CPF = Date.now() % 1e9;
const cpfsUsados = [gerarCpf(SEMENTE_CPF), gerarCpf(SEMENTE_CPF + 1), gerarCpf(SEMENTE_CPF + 2)];

// Cada grupo de casos usa um IP próprio (cabeçalho cf-connecting-ip, o preferido pelas funções)
// para não esgotar o limite de tentativas dos outros.
const ipsUsados = [];
function ipUnico() {
  const n = ipsUsados.length + 1;
  const ip = `10.${Date.now() % 250}.${Math.floor(Math.random() * 250)}.${n}`;
  ipsUsados.push(ip);
  return { 'cf-connecting-ip': ip };
}

async function criarUsuarioAuth(email, senha = SENHA) {
  const usuario = await authAdmin('users', {
    metodo: 'POST',
    corpo: { email, password: senha, email_confirm: true },
  });
  dados.usuariosAuth.push(usuario.id);
  return usuario;
}

async function semearAuth() {
  dados.usuariosAuth = [];
  dados.emailsAuth = [];
  dados.admin = await criarUsuarioAuth(emailDe('admin'));
  await rest('admins', { metodo: 'POST', corpo: { user_id: dados.admin.id } });
  // Segundo admin: o caso de nova senha troca a senha dele sem afetar o login dos outros casos.
  dados.admin2 = await criarUsuarioAuth(emailDe('admin2'));
  await rest('admins', { metodo: 'POST', corpo: { user_id: dados.admin2.id } });
  // Usuário do Auth sem papel de admin (não existe mais conta de cliente).
  dados.comum = await criarUsuarioAuth(emailDe('comum'));
}

async function limparAuth() {
  for (const id of dados.usuariosAuth ?? []) {
    await authAdmin(`users/${id}`, { metodo: 'DELETE' }).catch(() => {});
  }
  const lista = await authAdmin('users?per_page=1000');
  for (const u of lista?.users ?? []) {
    if (u.email?.endsWith(`-${sufixo}@example.com`)) {
      await authAdmin(`users/${u.id}`, { metodo: 'DELETE' }).catch(() => {});
    }
  }
  const ips = ipsUsados.map((ip) => `"${ip}"`).join(',');
  if (ips) await rest(`tentativas_login?ip=in.(${ips})`, { metodo: 'DELETE' });
  await rest(`tentativas_login?email=like.*-${sufixo}@example.com`, { metodo: 'DELETE' });
}

function login(rotulo, senha, painel, headers) {
  return chamar('auth-login', { email: emailDe(rotulo), senha, painel }, { headers });
}

async function semear() {
  const [categoria] = await rest('categorias', {
    metodo: 'POST',
    corpo: { nome: `Teste ${sufixo}`, slug: `teste-${sufixo}`, ordem: 9999, ativo: true },
  });
  dados.categoria = categoria;
  const [ativo] = await rest('produtos', {
    metodo: 'POST',
    corpo: { categoria_id: categoria.id, nome: `Produto Ativo ${sufixo} 100%_`, ativo: true },
  });
  dados.produtoAtivo = ativo;
  const [inativo] = await rest('produtos', {
    metodo: 'POST',
    corpo: { categoria_id: categoria.id, nome: `Produto Inativo ${sufixo}`, ativo: false },
  });
  dados.produtoInativo = inativo;
  await rest('produto_variacoes', {
    metodo: 'POST',
    corpo: [
      {
        produto_id: ativo.id,
        nome_tamanho: '2L',
        ordem: 1,
        ativo: true,
        vende_unidade: true,
        preco_unidade_centavos: 850,
        vende_fardo: true,
        qtd_por_fardo: 6,
        preco_fardo_centavos: 4500,
      },
      {
        produto_id: ativo.id,
        nome_tamanho: 'Inativa',
        ordem: 2,
        ativo: false,
        vende_unidade: true,
        preco_unidade_centavos: 100,
        vende_fardo: false,
        qtd_por_fardo: null,
        preco_fardo_centavos: null,
      },
    ],
  });
  await rest('produto_fotos', {
    metodo: 'POST',
    corpo: [
      { produto_id: ativo.id, caminho: `teste/${sufixo}-2.jpg`, ordem: 2 },
      { produto_id: ativo.id, caminho: `teste/${sufixo}-1.jpg`, ordem: 1 },
    ],
  });
  await rest('produto_variacoes', {
    metodo: 'POST',
    corpo: {
      produto_id: inativo.id,
      nome_tamanho: 'X',
      ativo: true,
      vende_unidade: true,
      preco_unidade_centavos: 500,
    },
  });
}

async function limpar() {
  // Produtos removem fotos e variações em cascata.
  if (dados.produtoAtivo)
    await rest(`produtos?id=eq.${dados.produtoAtivo.id}`, { metodo: 'DELETE' });
  if (dados.produtoInativo)
    await rest(`produtos?id=eq.${dados.produtoInativo.id}`, { metodo: 'DELETE' });
  if (dados.categoria) await rest(`categorias?id=eq.${dados.categoria.id}`, { metodo: 'DELETE' });
}

// ---------- casos ----------

const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

export const casos = [
  {
    nome: 'catalogo categorias -> 200 ok:true e inclui a categoria de teste',
    async executar() {
      const r = await chamar('catalogo', { acao: 'categorias' });
      igual(r.status, 200, 'status');
      igual(r.json?.ok, true, 'ok');
      afirmar(
        r.json.dados.some((c) => c.slug === dados.categoria.slug),
        'categoria de teste ausente',
      );
      igual(r.headers.get('x-content-type-options'), 'nosniff', 'nosniff');
      igual(r.headers.get('cache-control'), 'no-store', 'cache-control');
    },
  },
  {
    nome: 'GET -> 405',
    async executar() {
      const r = await chamar('catalogo', null, { metodo: 'GET' });
      igual(r.status, 405, 'status');
    },
  },
  {
    nome: 'OPTIONS de origem permitida -> CORS liberado',
    async executar() {
      const r = await chamar('catalogo', null, {
        metodo: 'OPTIONS',
        headers: { Origin: ORIGEM_OK },
      });
      afirmar(r.status === 200 || r.status === 204, `status ${r.status}`);
      // O gateway local (Kong) responde '*' por conta própria; a regra estrita fica em http.test.js.
      afirmar(
        [ORIGEM_OK, '*'].includes(r.headers.get('access-control-allow-origin')),
        'allow-origin inesperado',
      );
    },
  },
  {
    nome: 'origem não permitida -> não é ecoada em Access-Control-Allow-Origin',
    async executar() {
      const r = await chamar(
        'catalogo',
        { acao: 'categorias' },
        { headers: { Origin: 'http://malicioso.example' } },
      );
      // Kong local injeta '*'; em produção a função é quem decide (coberto em http.test.js).
      afirmar(
        [null, '*'].includes(r.headers.get('access-control-allow-origin')),
        'origem não permitida foi ecoada',
      );
    },
  },
  {
    nome: 'acao desconhecida -> 400',
    async executar() {
      const r = await chamar('catalogo', { acao: 'xyz' });
      igual(r.status, 400, 'status');
      igual(r.json?.ok, false, 'ok');
    },
  },
  {
    nome: 'corpo não JSON -> 400',
    async executar() {
      const r = await chamar('catalogo', null, { bruto: 'isto não é json' });
      igual(r.status, 400, 'status');
    },
  },
  {
    nome: 'corpo maior que 100 KB -> 413',
    async executar() {
      const r = await chamar('catalogo', { acao: 'categorias', lixo: 'a'.repeat(110 * 1024) });
      igual(r.status, 413, 'status');
    },
  },
  {
    nome: 'produtos por categoria: só o ativo, com foto de menor ordem e menor preço',
    async executar() {
      const r = await chamar('catalogo', {
        acao: 'produtos',
        categoria_slug: dados.categoria.slug,
      });
      igual(r.status, 200, 'status');
      igual(r.json.dados.total, 1, 'total');
      const [item] = r.json.dados.itens;
      igual(item.id, dados.produtoAtivo.id, 'id');
      igual(item.a_partir_de_centavos, 850, 'a_partir_de_centavos');
      afirmar(item.foto_url?.endsWith(`teste/${sufixo}-1.jpg`), `foto_url ${item.foto_url}`);
    },
  },
  {
    nome: 'produtos: busca com curingas é literal',
    async executar() {
      const achou = await chamar('catalogo', { acao: 'produtos', busca: `ativo ${sufixo} 100%_` });
      igual(achou.json.dados.total, 1, 'total com busca exata');
      const nao = await chamar('catalogo', { acao: 'produtos', busca: '%' + sufixo + '%zzz' });
      igual(nao.json.dados.total, 0, 'total com % literal');
    },
  },
  {
    nome: 'produtos: página além do fim -> lista vazia',
    async executar() {
      const r = await chamar('catalogo', {
        acao: 'produtos',
        categoria_slug: dados.categoria.slug,
        pagina: 99,
      });
      igual(r.status, 200, 'status');
      igual(r.json.dados.itens.length, 0, 'itens');
    },
  },
  {
    nome: 'produto ativo -> fotos ordenadas e só variações ativas',
    async executar() {
      const r = await chamar('catalogo', { acao: 'produto', id: dados.produtoAtivo.id });
      igual(r.status, 200, 'status');
      const p = r.json.dados;
      igual(p.fotos.length, 2, 'fotos');
      afirmar(p.fotos[0].endsWith(`${sufixo}-1.jpg`), 'ordem das fotos');
      igual(p.variacoes.length, 1, 'variações ativas');
      igual(p.variacoes[0].nome_tamanho, '2L', 'variação');
    },
  },
  {
    nome: 'produto inativo -> 404',
    async executar() {
      const r = await chamar('catalogo', { acao: 'produto', id: dados.produtoInativo.id });
      igual(r.status, 404, 'status');
    },
  },
  {
    nome: 'produto inexistente -> 404',
    async executar() {
      const r = await chamar('catalogo', { acao: 'produto', id: UUID_INEXISTENTE });
      igual(r.status, 404, 'status');
    },
  },
  {
    nome: 'produtos: pagina absurda ou inválida -> 400',
    async executar() {
      for (const pagina of [1e300, 10001, 0, -1, 1.5, 'x']) {
        const r = await chamar('catalogo', { acao: 'produtos', pagina });
        igual(r.status, 400, `status para pagina=${pagina}`);
      }
    },
  },
  {
    nome: 'produto com id inválido -> 400',
    async executar() {
      const r = await chamar('catalogo', { acao: 'produto', id: 'nao-e-uuid' });
      igual(r.status, 400, 'status');
    },
  },
  {
    nome: 'config-publica -> 200 com nome, cnpj, logo_url, whatsapp, endereco, email_privacidade',
    async executar() {
      const r = await chamar('config-publica', {});
      igual(r.status, 200, 'status');
      for (const k of ['nome', 'cnpj', 'logo_url', 'whatsapp', 'endereco', 'email_privacidade']) {
        afirmar(k in r.json.dados, `campo ${k} ausente`);
      }
    },
  },
  ...casosAuth(),
  ...casosPedido(),
  ...casosAdmin(),
  ...casosAdminClientesConfig(),
];

// ---------- casos de autenticação (só admin) ----------

const MSG_CREDENCIAIS = 'E-mail ou senha inválidos.';
const MSG_RECUPERAR = 'Se o e-mail estiver cadastrado, você receberá um link.';
const MAILPIT_URL = process.env.MAILPIT_URL || 'http://127.0.0.1:54324';

function exigirSessao(sessao) {
  afirmar(sessao?.access_token && sessao?.refresh_token && sessao?.expires_at, 'sessão incompleta');
  igual(Object.keys(sessao).length, 3, 'campos da sessão');
}

// Token de uma sessão aberta por link de recuperação (gera o link pelo admin e o confirma).
async function tokenDeRecuperacao(email) {
  const link = await authAdmin('generate_link', {
    metodo: 'POST',
    corpo: { type: 'recovery', email },
  });
  const resposta = await fetch(`${API_URL}/auth/v1/verify`, {
    method: 'POST',
    headers: { apikey: SERVICE_ROLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'recovery', token_hash: link.hashed_token }),
  });
  const json = await resposta.json();
  if (!json.access_token) throw new Error(`verify recovery falhou: ${JSON.stringify(json)}`);
  return json.access_token;
}

// Token de acesso de um usuário do Auth direto no GoTrue (para usuário que não é admin).
async function tokenDoGoTrue(email, senha = SENHA) {
  const resposta = await fetch(`${API_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SERVICE_ROLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: senha }),
  });
  const json = await resposta.json();
  if (!json.access_token) throw new Error(`login no GoTrue falhou: ${JSON.stringify(json)}`);
  return json.access_token;
}

// Quantos e-mails o Mailpit local recebeu para o endereço (o GoTrue local manda tudo para lá).
async function emailsRecebidos(endereco) {
  const resposta = await fetch(
    `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${endereco}`)}`,
  );
  if (!resposta.ok) throw new Error(`Mailpit indisponível (status ${resposta.status})`);
  return (await resposta.json()).messages_count ?? 0;
}

// Texto do e-mail mais recente para o endereço (espera o envio em segundo plano da função).
async function textoDoEmail(endereco, tentativas = 30) {
  for (let i = 0; i < tentativas; i += 1) {
    const busca = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${endereco}`)}&limit=1`,
    );
    const [mensagem] = (await busca.json()).messages ?? [];
    if (mensagem) {
      const completa = await fetch(`${MAILPIT_URL}/api/v1/message/${mensagem.ID}`);
      const dados = await completa.json();
      return `${dados.Text ?? ''}
${dados.HTML ?? ''}`;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('o e-mail de recuperação não chegou ao Mailpit');
}

function casosAuth() {
  const ipLogin = ipUnico();
  const ipLimite = ipUnico();
  const ipOutros = ipUnico();

  return [
    {
      nome: 'auth-login admin com painel admin -> 200 com sessão, papel admin e nome Administrador',
      async executar() {
        const r = await login('admin', SENHA, 'admin', ipLogin);
        igual(r.status, 200, `status (${r.texto})`);
        exigirSessao(r.json.dados.sessao);
        igual(r.json.dados.usuario.papel, 'admin', 'papel');
        igual(r.json.dados.usuario.nome, 'Administrador', 'nome');
      },
    },
    {
      nome: 'auth-login e-mail em maiúsculas com espaços é normalizado',
      async executar() {
        const email = `  ${emailDe('admin').toUpperCase()} `;
        const r = await chamar(
          'auth-login',
          { email, senha: SENHA, painel: 'admin' },
          { headers: ipLogin },
        );
        igual(r.status, 200, 'status');
      },
    },
    {
      nome: "auth-login painel 'loja' (ou qualquer outro) -> 400 Painel inválido, mesmo com credenciais certas",
      async executar() {
        for (const painel of ['loja', 'outro', undefined]) {
          const r = await login('admin', SENHA, painel, ipOutros);
          igual(r.status, 400, `status painel ${painel}`);
          igual(r.json.erro, 'Painel inválido.', 'mensagem');
        }
      },
    },
    {
      nome: 'auth-login de usuário que não é admin -> 401 genérico e sem sessão',
      async executar() {
        const r = await login('comum', SENHA, 'admin', ipOutros);
        igual(r.status, 401, 'status');
        igual(r.json.erro, MSG_CREDENCIAIS, 'mensagem');
        afirmar(!r.json.dados, 'não deve devolver sessão');
      },
    },
    {
      nome: 'auth-login e-mail inexistente -> 401 genérico',
      async executar() {
        const r = await login('inexistente', SENHA, 'admin', ipOutros);
        igual(r.status, 401, 'status');
        igual(r.json.erro, MSG_CREDENCIAIS, 'mensagem');
      },
    },
    {
      nome: 'auth-login senha errada 5x -> 6ª retorna 429 mesmo com senha certa',
      async executar() {
        const email = emailDe('limite');
        await criarUsuarioAuth(email);
        const tentar = (senha) =>
          chamar('auth-login', { email, senha, painel: 'admin' }, { headers: ipLimite });
        for (let i = 1; i <= 5; i += 1) {
          igual((await tentar('errada-' + i)).status, 401, `tentativa ${i}`);
        }
        const r = await tentar(SENHA);
        igual(r.status, 429, 'status');
        igual(r.json.erro, 'Muitas tentativas. Tente novamente em alguns minutos.', 'mensagem');
        afirmar(!('liberaEm' in r.json), 'não deve revelar liberaEm');
      },
    },
    {
      nome: 'auth-refresh renova a sessão; token inválido -> 401',
      async executar() {
        const entrou = await login('admin', SENHA, 'admin', ipLogin);
        const r = await chamar('auth-refresh', {
          refresh_token: entrou.json.dados.sessao.refresh_token,
        });
        igual(r.status, 200, `status (${r.texto})`);
        exigirSessao(r.json.dados.sessao);
        const ruim = await chamar('auth-refresh', { refresh_token: 'invalido' });
        igual(ruim.status, 401, 'status inválido');
        igual(ruim.json.erro, 'Sessão expirada. Faça login novamente.', 'mensagem');
      },
    },
    {
      nome: 'auth-logout: com token -> 200 e token deixa de valer; sem token -> 401; token ruim -> 200',
      async executar() {
        const entrou = await login('admin', SENHA, 'admin', ipLogin);
        const { access_token, refresh_token } = entrou.json.dados.sessao;
        const auth = { Authorization: `Bearer ${access_token}` };
        igual((await chamar('auth-logout', {}, { headers: auth })).status, 200, 'logout');
        const sessaoMorta = await fetch(`${API_URL}/auth/v1/user`, {
          headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${access_token}` },
        });
        afirmar(sessaoMorta.status !== 200, 'access_token ainda vale após o logout');
        const refresh = await chamar('auth-refresh', { refresh_token });
        igual(refresh.status, 401, 'refresh_token ainda vale após o logout');
        igual((await chamar('auth-logout', {})).status, 401, 'sem token');
        const ruim = await chamar(
          'auth-logout',
          {},
          { headers: { Authorization: 'Bearer x.y.z' } },
        );
        igual(ruim.status, 200, 'token inválido');
      },
    },
    {
      nome: 'auth-recuperar-senha: e-mail de admin, de não-admin e inexistente -> 200 com a mesma mensagem',
      async executar() {
        for (const email of [emailDe('admin'), emailDe('comum'), emailDe('nao-existe')]) {
          const r = await chamar('auth-recuperar-senha', { email }, { headers: ipOutros });
          igual(r.status, 200, `status (${r.texto})`);
          igual(r.json.dados, MSG_RECUPERAR, 'mensagem');
        }
      },
    },
    {
      nome: 'auth-recuperar-senha: e-mail de admin recebe link que aponta para o painel (ADMIN_URL/nova-senha)',
      async executar() {
        const email = emailDe('admin');
        const r = await chamar('auth-recuperar-senha', { email }, { headers: ipUnico() });
        igual(r.status, 200, `status (${r.texto})`);
        igual(r.json.dados, MSG_RECUPERAR, 'mensagem');
        const texto = await textoDoEmail(email);
        afirmar(texto.includes('/painel-x7k2q/nova-senha'), 'link sem /painel-x7k2q/nova-senha');
      },
    },
    {
      nome: 'auth-recuperar-senha: e-mail que não é de admin não recebe link (nenhum e-mail enviado)',
      async executar() {
        const email = emailDe('comum');
        const r = await chamar('auth-recuperar-senha', { email }, { headers: ipUnico() });
        igual(r.status, 200, 'status');
        igual(r.json.dados, MSG_RECUPERAR, 'mensagem');
        igual(await emailsRecebidos(email), 0, 'e-mails enviados ao não-admin');
      },
    },
    {
      nome: 'auth-recuperar-senha: acima do limite continua 200 com a mesma mensagem',
      async executar() {
        const email = emailDe('spam');
        for (let i = 0; i < 5; i += 1) {
          const r = await chamar('auth-recuperar-senha', { email }, { headers: ipOutros });
          igual(r.status, 200, `tentativa ${i + 1}`);
          igual(r.json.dados, MSG_RECUPERAR, 'mensagem');
        }
      },
    },
    {
      nome: 'GoTrue /auth/v1/signup está fechado (não existe cadastro de cliente)',
      async executar() {
        const r = await fetch(`${API_URL}/auth/v1/signup`, {
          method: 'POST',
          headers: { apikey: SERVICE_ROLE_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailDe('signup'), password: SENHA }),
        });
        afirmar(r.status >= 400, `signup aberto (status ${r.status})`);
      },
    },
    {
      nome: 'auth-nova-senha: senha curta -> 400; token inválido, de login comum ou de não-admin -> 401; de admin em recuperação -> troca a senha',
      async executar() {
        const access_token = await tokenDeRecuperacao(emailDe('admin2'));
        const outra = await login('admin2', SENHA, 'admin', ipLogin);
        igual(
          (await chamar('auth-nova-senha', { access_token, senha: '123' })).status,
          400,
          'curta',
        );
        const ruim = await chamar('auth-nova-senha', { access_token: 'x.y.z', senha: SENHA });
        igual(ruim.status, 401, 'token inválido');
        const tokenLogin = outra.json.dados.sessao.access_token;
        const deLogin = await chamar('auth-nova-senha', { access_token: tokenLogin, senha: SENHA });
        igual(deLogin.status, 401, 'token de login comum (amr password)');
        const tokenComum = await tokenDeRecuperacao(emailDe('comum'));
        const deComum = await chamar('auth-nova-senha', {
          access_token: tokenComum,
          senha: 'Outra-senha-789',
        });
        igual(deComum.status, 401, 'usuário que não é admin');
        afirmar((await tokenDoGoTrue(emailDe('comum'))).length > 0, 'senha do não-admin mudou');
        const novaSenha = 'Outra-senha-456';
        const ok = await chamar('auth-nova-senha', { access_token, senha: novaSenha });
        igual(ok.status, 200, `status (${ok.texto})`);
        const refreshOutra = outra.json.dados.sessao.refresh_token;
        igual(
          (await chamar('auth-refresh', { refresh_token: refreshOutra })).status,
          401,
          'outra sessão',
        );
        igual((await login('admin2', novaSenha, 'admin', ipLogin)).status, 200, 'nova senha');
        igual((await login('admin2', SENHA, 'admin', ipOutros)).status, 401, 'senha antiga');
      },
    },
  ];
}

// ---------- casos do pedido (público, sem conta) ----------

function gerarCnpj(semente) {
  const base = String(semente).padStart(8, '0').slice(-8).split('').map(Number);
  base.push(0, 0, 0, 1);
  base.push(digitoVerificador(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]));
  base.push(digitoVerificador(base, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]));
  return base.join('');
}

const MSG_MUDOU = 'Alguns itens mudaram. Revise o carrinho.';
const MSG_SEM_WHATSAPP = 'A empresa ainda não configurou o WhatsApp.';
const MSG_LIMITE_PEDIDO = 'Muitos pedidos em pouco tempo. Tente novamente mais tarde.';
const WHATSAPP_TESTE = '(81) 99999-0000';

const bearer = (sessao) => ({ Authorization: `Bearer ${sessao.access_token}` });

async function variacoesDeTeste() {
  const ativas = await rest(
    `produto_variacoes?produto_id=eq.${dados.produtoAtivo.id}&ativo=eq.true`,
  );
  const doInativo = await rest(`produto_variacoes?produto_id=eq.${dados.produtoInativo.id}`);
  return { ativa: ativas[0], deProdutoInativo: doInativo[0] };
}

async function lerWhatsapp() {
  const [linha] = await rest('config_empresa?id=eq.1&select=whatsapp');
  return linha?.whatsapp ?? null;
}

const definirWhatsapp = (valor) =>
  rest('config_empresa?id=eq.1', { metodo: 'PATCH', corpo: { whatsapp: valor } });

// Executa `corpo` com o WhatsApp da empresa definido e restaura o valor original ao final.
async function comWhatsapp(valor, corpo) {
  const original = await lerWhatsapp();
  try {
    await definirWhatsapp(valor);
    await corpo();
  } finally {
    await definirWhatsapp(original);
  }
}

function formatarCpfTeste(cpf) {
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

const clientePf = (extra = {}) => ({
  tipo_pessoa: 'PF',
  nome: `Fulano ${sufixo}`,
  telefone: '(81) 98888-7777',
  cep: '50030-230',
  rua: 'Rua do Teste',
  numero: '10',
  bairro: 'Boa Vista',
  cidade: 'Recife',
  uf: 'PE',
  ...extra,
});

const textoDoLink = (link) => decodeURIComponent(link.split('?text=')[1]);

function casosPedido() {
  const itemOk = (extra = {}) => ({ forma: 'fardo', quantidade: 2, ...extra });
  // Cada chamada usa um IP novo (limite de 20 pedidos por hora por IP).
  const pedir = (corpo, headers = ipUnico()) => chamar('pedido-whatsapp', corpo, { headers });
  const pedidoValido = async (extra = {}) => {
    const { ativa } = await variacoesDeTeste();
    return {
      itens: [itemOk({ variacao_id: ativa.id })],
      precos_vistos: { [`${ativa.id}:fardo`]: 4500 },
      cliente: clientePf(),
      ...extra,
    };
  };

  return [
    {
      nome: 'pedido-revisar público (sem token): quantidade 0 -> 400; ok -> total e sem divergências',
      async executar() {
        const { ativa } = await variacoesDeTeste();
        const zero = { variacao_id: ativa.id, forma: 'fardo', quantidade: 0 };
        const ruim = await chamar('pedido-revisar', { itens: [zero] });
        igual(ruim.status, 400, 'quantidade 0');
        const ok = await chamar('pedido-revisar', {
          itens: [itemOk({ variacao_id: ativa.id })],
          precos_vistos: { [`${ativa.id}:fardo`]: 4500 },
        });
        igual(ok.status, 200, `status (${ok.texto})`);
        igual(ok.json.dados.total_centavos, 9000, 'total');
        igual(ok.json.dados.divergencias.length, 0, 'divergencias');
      },
    },
    {
      nome: 'pedido-revisar: corpo maior que 100 KB -> 413',
      async executar() {
        const r = await chamar('pedido-revisar', { itens: [], lixo: 'a'.repeat(110 * 1024) });
        igual(r.status, 413, 'status');
      },
    },
    {
      nome: 'pedido-whatsapp: preço visto diferente -> 409 com divergência',
      async executar() {
        const { ativa } = await variacoesDeTeste();
        const r = await pedir(
          await pedidoValido({ precos_vistos: { [`${ativa.id}:fardo`]: 4000 } }),
        );
        igual(r.status, 409, 'status');
        igual(r.json.ok, false, 'ok');
        igual(r.json.erro, MSG_MUDOU, 'mensagem');
        igual(r.json.dados.divergencias[0].tipo, 'preco_mudou', 'tipo');
      },
    },
    {
      nome: 'pedido-whatsapp: item de produto inativo -> 409 indisponivel',
      async executar() {
        const { deProdutoInativo } = await variacoesDeTeste();
        const r = await pedir(
          await pedidoValido({
            itens: [{ variacao_id: deProdutoInativo.id, forma: 'unidade', quantidade: 1 }],
            precos_vistos: undefined,
          }),
        );
        igual(r.status, 409, 'status');
        igual(r.json.dados.divergencias[0].tipo, 'indisponivel', 'tipo');
      },
    },
    {
      nome: 'pedido-whatsapp: observação acima de 500 caracteres -> 400',
      async executar() {
        const r = await pedir(await pedidoValido({ observacao: 'a'.repeat(501) }));
        igual(r.status, 400, 'status');
      },
    },
    {
      nome: 'pedido-whatsapp: cliente inválido ou ausente -> 400 com campos (chaves simples)',
      async executar() {
        const ruim = await pedir(
          await pedidoValido({ cliente: clientePf({ nome: '', telefone: '123', uf: 'XX' }) }),
        );
        igual(ruim.status, 400, 'status');
        for (const k of ['nome', 'telefone', 'uf']) afirmar(ruim.json.campos?.[k], `campos.${k}`);
        afirmar(!('cliente.nome' in ruim.json.campos), 'chave com prefixo');
        const pj = await pedir(
          await pedidoValido({ cliente: clientePf({ tipo_pessoa: 'PJ', razao_social: '' }) }),
        );
        igual(pj.status, 400, 'PJ incompleta');
        afirmar(pj.json.campos?.razao_social, 'campos.razao_social');
        afirmar(pj.json.campos?.cpf_cnpj, 'campos.cpf_cnpj');
        const sem = await pedir({ ...(await pedidoValido()), cliente: undefined });
        igual(sem.status, 400, 'sem cliente');
        afirmar(sem.json.campos?.nome, 'campos.nome sem cliente');
      },
    },
    {
      nome: 'pedido-whatsapp: WhatsApp da empresa vazio -> 503',
      async executar() {
        await comWhatsapp('', async () => {
          const r = await pedir(await pedidoValido());
          igual(r.status, 503, 'status');
          igual(r.json.erro, MSG_SEM_WHATSAPP, 'mensagem');
        });
      },
    },
    {
      nome: 'pedido-whatsapp PF sem token: link wa.me/55..., com produto e nome, sem CPF nem e-mail',
      async executar() {
        await comWhatsapp(WHATSAPP_TESTE, async () => {
          const cpf = cpfsUsados[2];
          const pedido = await pedidoValido({
            observacao: 'Entregar de manhã & ligar #1',
            // CPF e e-mail enviados à força: PF nunca os leva para a mensagem.
            cliente: clientePf({ cpf_cnpj: cpf, email: `pf-${sufixo}@example.com` }),
          });
          const r = await pedir(pedido);
          igual(r.status, 200, `status (${r.texto})`);
          const { link } = r.json.dados;
          afirmar(link.startsWith('https://wa.me/55'), `link ${link}`);
          const texto = textoDoLink(link);
          afirmar(texto.includes(`Produto Ativo ${sufixo}`), 'produto ausente na mensagem');
          afirmar(texto.includes(`Fulano ${sufixo}`), 'nome ausente na mensagem');
          afirmar(texto.includes('Entregar de manhã & ligar #1'), 'observação alterada');
          afirmar(!texto.includes(cpf), 'CPF (dígitos) vazou na mensagem');
          afirmar(!texto.includes(formatarCpfTeste(cpf)), 'CPF formatado vazou na mensagem');
          afirmar(!texto.includes('@example.com'), 'e-mail vazou na mensagem');
        });
      },
    },
    {
      nome: 'pedido-whatsapp PJ: mensagem com CNPJ e razão social',
      async executar() {
        await comWhatsapp(WHATSAPP_TESTE, async () => {
          const cliente = clientePf({
            tipo_pessoa: 'PJ',
            razao_social: 'Distribuidora Teste LTDA',
            cpf_cnpj: gerarCnpj(SEMENTE_CPF % 1e8),
          });
          const r = await pedir(await pedidoValido({ cliente }));
          igual(r.status, 200, `status (${r.texto})`);
          const texto = textoDoLink(r.json.dados.link);
          afirmar(texto.includes('CNPJ: '), 'CNPJ ausente');
          afirmar(texto.includes('Razão social: Distribuidora Teste LTDA'), 'razão social');
        });
      },
    },
    {
      nome: 'pedido-whatsapp: nome com quebras de linha e asteriscos não forja linhas na mensagem',
      async executar() {
        await comWhatsapp(WHATSAPP_TESTE, async () => {
          const cliente = clientePf({ nome: 'Fulano\n*Total: R$ 0,01*\nPIX agora' });
          const r = await pedir(await pedidoValido({ cliente }));
          igual(r.status, 200, `status (${r.texto})`);
          const texto = textoDoLink(r.json.dados.link);
          afirmar(!/^\*?Total: R\$ 0,01/m.test(texto), 'linha forjada na mensagem');
          afirmar(!/^PIX agora/m.test(texto), 'linha forjada na mensagem (2)');
        });
      },
    },
    {
      nome: 'pedido-whatsapp: 21º pedido do mesmo IP na hora -> 429; outro IP segue liberado',
      async executar() {
        await comWhatsapp(WHATSAPP_TESTE, async () => {
          const ip = ipUnico();
          const pedido = await pedidoValido();
          for (let i = 1; i <= 20; i += 1) {
            igual((await pedir(pedido, ip)).status, 200, `pedido ${i}`);
          }
          const r = await pedir(pedido, ip);
          igual(r.status, 429, 'status');
          igual(r.json.erro, MSG_LIMITE_PEDIDO, 'mensagem');
          afirmar(!('liberaEm' in r.json), 'não deve revelar liberaEm');
          igual((await pedir(pedido)).status, 200, 'outro IP');
        });
      },
    },
    {
      nome: 'pedido-whatsapp não grava dados do cliente (só IP e instante em tentativas_login)',
      async executar() {
        await comWhatsapp(WHATSAPP_TESTE, async () => {
          const ip = ipUnico();
          const nome = `Fulano Sigilo ${sufixo}`;
          const r = await pedir(await pedidoValido({ cliente: clientePf({ nome }) }), ip);
          igual(r.status, 200, 'status');
          const salvos = await rest(`clientes?nome=eq.${encodeURIComponent(nome)}&select=id`);
          igual(salvos.length, 0, 'cliente salvo em clientes');
          const tentativas = await rest(
            `tentativas_login?ip=eq.${ip['cf-connecting-ip']}&select=ip,email,acao`,
          );
          igual(tentativas.length, 1, 'tentativas registradas');
          igual(tentativas[0].acao, 'pedido', 'acao');
          igual(tentativas[0].email, null, 'e-mail guardado');
        });
      },
    },
  ];
}

// ---------- casos do admin: categorias, produtos e fotos (Task 9) ----------

const PNG_MINIMO_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const CAMINHO_PUBLICO_FOTOS = '/storage/v1/object/public/produtos/';

function bytesPng() {
  return Uint8Array.from(Buffer.from(PNG_MINIMO_BASE64, 'base64'));
}

async function enviarFoto(sessao, produtoId, bytes, nomeArquivo, tipo) {
  const form = new FormData();
  form.set('produto_id', produtoId);
  form.set('arquivo', new Blob([bytes], { type: tipo }), nomeArquivo);
  const resposta = await fetch(`${FUNCOES}/admin-fotos`, {
    method: 'POST',
    headers: bearer(sessao),
    body: form,
  });
  const texto = await resposta.text();
  return { status: resposta.status, json: JSON.parse(texto), texto };
}

// Status HTTP do arquivo público no Storage (200 existe; 400/404 não existe).
async function statusDaFoto(urlFoto) {
  const caminho = urlFoto.split(CAMINHO_PUBLICO_FOTOS)[1];
  const resposta = await fetch(`${API_URL}${CAMINHO_PUBLICO_FOTOS}${caminho}`);
  await resposta.arrayBuffer();
  return resposta.status;
}

async function storage(caminho, metodo, corpo) {
  const resposta = await fetch(`${API_URL}/storage/v1/${caminho}`, {
    method: metodo,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(corpo),
  });
  return resposta.json();
}

async function limparAdmin() {
  for (const id of dados.adminProdutos ?? []) {
    const lista = await storage('object/list/produtos', 'POST', { prefix: id, limit: 100 });
    const prefixes = (Array.isArray(lista) ? lista : []).map((o) => `${id}/${o.name}`);
    if (prefixes.length > 0) await storage('object/produtos', 'DELETE', { prefixes });
    await rest(`produtos?id=eq.${id}`, { metodo: 'DELETE' });
  }
  for (const id of dados.adminCategorias ?? []) {
    await rest(`categorias?id=eq.${id}`, { metodo: 'DELETE' });
  }
}

function casosAdmin() {
  const ip = ipUnico();
  const est = {};
  const nomeCategoria = `Água & Sucos ${sufixo}`;
  dados.adminProdutos = [];
  dados.adminCategorias = [];

  async function sessaoAdmin() {
    if (!est.admin) {
      const r = await login('admin', SENHA, 'admin', ip);
      igual(r.status, 200, `login admin (${r.texto})`);
      est.admin = r.json.dados.sessao;
    }
    return est.admin;
  }
  // Usuário do Auth que não é admin (sessão direta do GoTrue; o login do painel o recusa).
  async function sessaoNaoAdmin() {
    est.naoAdmin ??= { access_token: await tokenDoGoTrue(emailDe('comum')) };
    return est.naoAdmin;
  }
  const comoAdmin = async (funcao, corpo) =>
    chamar(funcao, corpo, { headers: bearer(await sessaoAdmin()) });
  const sucesso = (r) => {
    igual(r.status, 200, `status (${r.texto})`);
    return r.json.dados;
  };
  const categorias = (corpo) => comoAdmin('admin-categorias', corpo);
  const produtos = (corpo) => comoAdmin('admin-produtos', corpo);
  const variacaoUnidade = (extra = {}) => ({
    nome_tamanho: '2L',
    vende_unidade: true,
    preco_unidade_centavos: 850,
    ...extra,
  });
  const variacaoFardo = (extra = {}) => ({
    nome_tamanho: 'Fardo 6x2L',
    vende_fardo: true,
    qtd_por_fardo: 6,
    preco_fardo_centavos: 4500,
    ...extra,
  });
  const dadosProduto = (extra = {}) => ({
    categoria_id: est.categoria.id,
    nome: `Suco Admin ${sufixo}`,
    ...extra,
  });

  return [
    {
      nome: 'admin-categorias/produtos/fotos sem token ou com token inválido -> 401',
      async executar() {
        const ruim = { headers: { Authorization: 'Bearer x.y.z' } };
        for (const funcao of ['admin-categorias', 'admin-produtos', 'admin-fotos']) {
          igual((await chamar(funcao, { acao: 'listar' })).status, 401, `${funcao} sem token`);
          igual((await chamar(funcao, { acao: 'listar' }, ruim)).status, 401, `${funcao} inválido`);
        }
      },
    },
    {
      nome: 'admin-categorias/produtos/fotos com token de quem não é admin -> 403 (inclusive multipart)',
      async executar() {
        const cabecalho = { headers: bearer(await sessaoNaoAdmin()) };
        for (const funcao of ['admin-categorias', 'admin-produtos', 'admin-fotos']) {
          igual((await chamar(funcao, { acao: 'listar' }, cabecalho)).status, 403, funcao);
        }
        const form = new FormData();
        form.set('produto_id', UUID_INEXISTENTE);
        const r = await fetch(`${FUNCOES}/admin-fotos`, {
          method: 'POST',
          headers: cabecalho.headers,
          body: form,
        });
        igual(r.status, 403, 'multipart de não-admin');
      },
    },
    {
      nome: 'admin-categorias ação inválida (inclusive "constructor") -> 400',
      async executar() {
        igual((await categorias({ acao: 'constructor' })).status, 400, 'constructor');
        igual((await categorias({ acao: 'xyz' })).status, 400, 'xyz');
      },
    },
    {
      nome: 'admin-categorias criar gera slug sem acentos e resolve conflito com -2',
      async executar() {
        const primeira = sucesso(await categorias({ acao: 'criar', nome: nomeCategoria }));
        dados.adminCategorias.push(primeira.id);
        igual(primeira.slug, `agua-sucos-${sufixo}`, 'slug');
        const segunda = sucesso(await categorias({ acao: 'criar', nome: nomeCategoria }));
        dados.adminCategorias.push(segunda.id);
        igual(segunda.slug, `agua-sucos-${sufixo}-2`, 'slug repetido');
        est.categoria = primeira;
        est.categoria2 = segunda;
        igual((await categorias({ acao: 'criar', nome: '   ' })).status, 400, 'nome vazio');
      },
    },
    {
      nome: 'admin-categorias editar/listar inclui inativas; reordenar define a ordem',
      async executar() {
        const editada = sucesso(
          await categorias({ acao: 'editar', id: est.categoria2.id, ativo: false }),
        );
        igual(editada.ativo, false, 'ativo');
        igual(editada.slug, est.categoria2.slug, 'slug estável');
        sucesso(
          await categorias({ acao: 'reordenar', ids: [est.categoria2.id, est.categoria.id] }),
        );
        const lista = sucesso(await categorias({ acao: 'listar' }));
        const ordens = Object.fromEntries(lista.map((c) => [c.id, c.ordem]));
        igual(ordens[est.categoria2.id], 0, 'ordem 0');
        igual(ordens[est.categoria.id], 1, 'ordem 1');
        afirmar(
          lista.some((c) => c.id === est.categoria2.id && c.ativo === false),
          'inativa ausente',
        );
        igual(
          (await categorias({ acao: 'reordenar', ids: [UUID_INEXISTENTE] })).status,
          404,
          'id inexistente',
        );
        igual((await categorias({ acao: 'reordenar', ids: ['x'] })).status, 400, 'id inválido');
      },
    },
    {
      nome: 'admin-produtos criar com 2 variações (unidade + fardo)',
      async executar() {
        const criado = sucesso(
          await produtos({
            acao: 'criar',
            produto: dadosProduto({ descricao: 'Teste' }),
            variacoes: [variacaoUnidade(), variacaoFardo()],
          }),
        );
        dados.adminProdutos.push(criado.id);
        est.produto = criado;
        igual(criado.variacoes.length, 2, 'variações');
        igual(criado.variacoes[0].preco_unidade_centavos, 850, 'preço unidade');
        igual(criado.variacoes[1].qtd_por_fardo, 6, 'qtd fardo');
        igual(criado.ativo, true, 'ativo');
      },
    },
    {
      nome: 'admin-produtos criar inválido -> 400 (sem variações, preço em string, categoria inexistente)',
      async executar() {
        const sem = await produtos({ acao: 'criar', produto: dadosProduto(), variacoes: [] });
        igual(sem.status, 400, 'sem variações');
        afirmar(sem.json.campos?.variacoes, 'campos.variacoes ausente');
        const preco = await produtos({
          acao: 'criar',
          produto: dadosProduto(),
          variacoes: [variacaoUnidade({ preco_unidade_centavos: '10,50' })],
        });
        igual(preco.status, 400, 'preço string');
        const cat = await produtos({
          acao: 'criar',
          produto: dadosProduto({ categoria_id: UUID_INEXISTENTE }),
          variacoes: [variacaoUnidade()],
        });
        igual(cat.status, 400, 'categoria inexistente');
      },
    },
    {
      nome: 'admin-produtos editar remove uma variação, atualiza outra e cria uma nova',
      async executar() {
        const [unidade, fardo] = est.produto.variacoes;
        const nome = `Suco Editado ${sufixo}`;
        let editado = sucesso(
          await produtos({
            acao: 'editar',
            id: est.produto.id,
            produto: dadosProduto({ nome }),
            variacoes: [{ ...unidade, preco_unidade_centavos: 900 }],
          }),
        );
        igual(editado.nome, nome, 'nome');
        igual(editado.variacoes.length, 1, 'uma variação restou');
        igual(editado.variacoes[0].id, unidade.id, 'id preservado');
        igual(editado.variacoes[0].preco_unidade_centavos, 900, 'preço atualizado');
        igual((await rest(`produto_variacoes?id=eq.${fardo.id}`)).length, 0, 'removida do banco');
        editado = sucesso(
          await produtos({
            acao: 'editar',
            id: est.produto.id,
            produto: dadosProduto({ nome }),
            variacoes: [editado.variacoes[0], variacaoFardo({ nome_tamanho: 'Caixa' })],
          }),
        );
        igual(editado.variacoes.length, 2, 'variação nova criada');
        est.produto = editado;
      },
    },
    {
      nome: 'admin-produtos editar com id de variação de outro produto -> 400 e nada muda',
      async executar() {
        const { deProdutoInativo } = await variacoesDeTeste();
        const r = await produtos({
          acao: 'editar',
          id: est.produto.id,
          produto: dadosProduto({ nome: 'Invasor' }),
          variacoes: [variacaoUnidade({ id: deProdutoInativo.id })],
        });
        igual(r.status, 400, `status (${r.texto})`);
        const depois = sucesso(await produtos({ acao: 'obter', id: est.produto.id }));
        igual(depois.nome, est.produto.nome, 'nome intacto (transação desfeita)');
        igual(depois.variacoes.length, est.produto.variacoes.length, 'variações intactas');
        const alheia = await rest(`produto_variacoes?id=eq.${deProdutoInativo.id}`);
        igual(alheia[0].produto_id, deProdutoInativo.produto_id, 'variação alheia intacta');
      },
    },
    {
      nome: 'admin-produtos obter inexistente -> 404; id inválido -> 400',
      async executar() {
        igual((await produtos({ acao: 'obter', id: UUID_INEXISTENTE })).status, 404, 'inexistente');
        igual((await produtos({ acao: 'obter', id: 'x' })).status, 400, 'inválido');
      },
    },
    {
      nome: 'admin-fotos: .txt renomeado para .jpg -> 400 e nada gravado',
      async executar() {
        const texto = new TextEncoder().encode('isto é só texto, não uma imagem');
        const sessao = await sessaoAdmin();
        const r = await enviarFoto(sessao, est.produto.id, texto, 'foto.jpg', 'image/jpeg');
        igual(r.status, 400, `status (${r.texto})`);
        igual((await rest(`produto_fotos?produto_id=eq.${est.produto.id}`)).length, 0, 'fotos');
      },
    },
    {
      nome: 'admin-fotos: PNG real é aceito (nome e MIME do cliente ignorados) e fica público',
      async executar() {
        const sessao = await sessaoAdmin();
        const r = await enviarFoto(sessao, est.produto.id, bytesPng(), 'nome.txt', 'text/plain');
        const foto = sucesso(r);
        afirmar(foto.url.endsWith('.png'), `extensão pelo conteúdo: ${foto.url}`);
        afirmar(foto.url.includes(`/${est.produto.id}/`), 'caminho com produto_id');
        igual(await statusDaFoto(foto.url), 200, 'arquivo público');
        est.foto = foto;
      },
    },
    {
      nome: 'admin-fotos: produto inexistente -> 404; 11ª foto -> 400 "Limite de 10 fotos"',
      async executar() {
        const sessao = await sessaoAdmin();
        const nulo = await enviarFoto(sessao, UUID_INEXISTENTE, bytesPng(), 'a.png', 'image/png');
        igual(nulo.status, 404, 'produto inexistente');
        const extras = Array.from({ length: 9 }, (_, i) => ({
          produto_id: est.produto.id,
          caminho: `${est.produto.id}/falsa-${i}.png`,
          ordem: 10 + i,
        }));
        await rest('produto_fotos', { metodo: 'POST', corpo: extras });
        const r = await enviarFoto(sessao, est.produto.id, bytesPng(), 'a.png', 'image/png');
        igual(r.status, 400, 'status');
        igual(r.json.erro, 'Limite de 10 fotos por produto.', 'mensagem');
        await rest(`produto_fotos?caminho=like.*falsa-*&produto_id=eq.${est.produto.id}`, {
          metodo: 'DELETE',
        });
      },
    },
    {
      nome: 'admin-fotos reordenar/remover; admin-produtos listar inclui inativo, foto e preço',
      async executar() {
        const sessao = await sessaoAdmin();
        const segunda = sucesso(
          await enviarFoto(sessao, est.produto.id, bytesPng(), 'b.png', 'image/png'),
        );
        const reordenadas = sucesso(
          await comoAdmin('admin-fotos', {
            acao: 'reordenar',
            produto_id: est.produto.id,
            ids: [segunda.id, est.foto.id],
          }),
        );
        igual(reordenadas[0].id, segunda.id, 'nova primeira');
        const incompleta = await comoAdmin('admin-fotos', {
          acao: 'reordenar',
          produto_id: est.produto.id,
          ids: [segunda.id],
        });
        igual(incompleta.status, 400, 'lista incompleta');
        sucesso(await comoAdmin('admin-fotos', { acao: 'remover', id: segunda.id }));
        afirmar((await statusDaFoto(segunda.url)) !== 200, 'arquivo removido do Storage');
        const outra = await comoAdmin('admin-fotos', { acao: 'remover', id: segunda.id });
        igual(outra.status, 404, '2ª remoção');

        const inativo = dadosProduto({ nome: est.produto.nome, ativo: false });
        sucesso(
          await produtos({
            acao: 'editar',
            id: est.produto.id,
            produto: inativo,
            variacoes: est.produto.variacoes,
          }),
        );
        const lista = sucesso(await produtos({ acao: 'listar', busca: `Editado ${sufixo}*` }));
        const item = lista.itens.find((p) => p.id === est.produto.id);
        afirmar(item, 'produto inativo ausente da listagem admin');
        igual(item.ativo, false, 'inativo');
        igual(item.categoria_nome, nomeCategoria, 'categoria_nome');
        igual(item.foto_url, est.foto.url, 'foto_url');
        igual(item.a_partir_de_centavos, 900, 'a partir de');
        igual(item.total_variacoes, est.produto.variacoes.length, 'total_variacoes');
        const filtro = { acao: 'listar', categoria_id: est.categoria2.id };
        igual(sucesso(await produtos(filtro)).itens.length, 0, 'filtro por categoria');
        igual((await produtos({ acao: 'listar', pagina: 0 })).status, 400, 'página inválida');
      },
    },
    {
      nome: 'admin-categorias excluir categoria com produto -> 409; sem produtos -> exclui',
      async executar() {
        const r = await categorias({ acao: 'excluir', id: est.categoria.id });
        igual(r.status, 409, 'status');
        igual(
          r.json.erro,
          'Esta categoria tem produtos. Mova ou exclua os produtos antes.',
          'mensagem',
        );
        sucesso(await categorias({ acao: 'excluir', id: est.categoria2.id }));
        igual((await rest(`categorias?id=eq.${est.categoria2.id}`)).length, 0, 'excluída');
      },
    },
    {
      nome: 'admin-produtos excluir remove produto, variações, fotos e o arquivo do Storage',
      async executar() {
        igual(await statusDaFoto(est.foto.url), 200, 'arquivo existe antes');
        sucesso(await produtos({ acao: 'excluir', id: est.produto.id }));
        igual((await rest(`produtos?id=eq.${est.produto.id}`)).length, 0, 'produto');
        const filtro = `produto_id=eq.${est.produto.id}`;
        igual((await rest(`produto_variacoes?${filtro}`)).length, 0, 'variações');
        igual((await rest(`produto_fotos?${filtro}`)).length, 0, 'fotos');
        afirmar((await statusDaFoto(est.foto.url)) !== 200, 'arquivo ainda existe no Storage');
        igual((await produtos({ acao: 'excluir', id: est.produto.id })).status, 404, 'de novo');
      },
    },
  ];
}

// ---------- casos do admin: clientes e configurações (Task 10) ----------

const CAMPOS_CONFIG = 'nome,cnpj,whatsapp,endereco,rodape_mensagem,email_privacidade,logo_caminho';
const CNPJ_CONFIG = '11222333000181';
const MSG_DOCUMENTO_DUPLICADO = 'Este documento já está cadastrado.';

async function enviarLogo(sessao, bytes, tipo = 'image/png') {
  const form = new FormData();
  form.set('acao', 'enviar_logo');
  form.set('arquivo', new Blob([bytes], { type: tipo }), 'logo.png');
  const resposta = await fetch(`${FUNCOES}/admin-config`, {
    method: 'POST',
    headers: bearer(sessao),
    body: form,
  });
  const texto = await resposta.text();
  return { status: resposta.status, json: JSON.parse(texto), texto };
}

async function limparAdmin10() {
  for (const id of dados.clientesCriados ?? []) {
    await rest(`clientes?id=eq.${id}`, { metodo: 'DELETE' });
  }
  for (const id of dados.categoriasSlug ?? []) {
    await rest(`categorias?id=eq.${id}`, { metodo: 'DELETE' });
  }
  if (!dados.configOriginal) return;
  const prefixes = (dados.logosTeste ?? []).filter(Boolean);
  if (prefixes.length > 0) await storage('object/produtos', 'DELETE', { prefixes });
  await rest('config_empresa?id=eq.1', { metodo: 'PATCH', corpo: dados.configOriginal });
}

function casosAdminClientesConfig() {
  const ip = ipUnico();
  const est = {};
  dados.logosTeste = [];
  dados.categoriasSlug = [];
  dados.clientesCriados = [];
  const rotuloA = `ca${sufixo}`;
  const rotuloB = `cb${sufixo}`;
  const cpfA = gerarCpf(SEMENTE_CPF + 20);
  const cpfB = gerarCpf(SEMENTE_CPF + 21);
  const cnpjA = gerarCnpj(SEMENTE_CPF + 22);

  async function sessaoAdmin() {
    if (!est.admin) {
      const r = await login('admin', SENHA, 'admin', ip);
      igual(r.status, 200, `login admin (${r.texto})`);
      est.admin = r.json.dados.sessao;
    }
    return est.admin;
  }
  const comoAdmin = async (funcao, corpo) =>
    chamar(funcao, corpo, { headers: bearer(await sessaoAdmin()) });
  const clientes = (corpo) => comoAdmin('admin-clientes', corpo);
  const config = (corpo) => comoAdmin('admin-config', corpo);
  const sucesso = (r) => {
    igual(r.status, 200, `status (${r.texto})`);
    return r.json.dados;
  };
  const editarA = (dadosEdicao) => clientes({ acao: 'editar', id: est.idA, dados: dadosEdicao });
  const fichaPf = (rotulo, extra = {}) => ({
    tipo_pessoa: 'PF',
    nome: `Cliente ${rotulo}`,
    email: emailDe(rotulo),
    telefone: '(81) 98888-7777',
    cep: '50030-230',
    rua: 'Rua do Teste',
    numero: '10',
    bairro: 'Boa Vista',
    cidade: 'Recife',
    uf: 'PE',
    observacoes: 'Paga no dia 10',
    ...extra,
  });
  async function criarCliente(ficha) {
    const r = await clientes({ acao: 'criar', dados: ficha });
    const criado = sucesso(r);
    dados.clientesCriados.push(criado.id);
    return criado;
  }
  async function preparar() {
    if (est.idA) return;
    est.idA = (await criarCliente(fichaPf(rotuloA, { cpf_cnpj: cpfA }))).id;
    est.idB = (await criarCliente(fichaPf(rotuloB, { cpf_cnpj: formatarCpfTeste(cpfB) }))).id;
    dados.configOriginal ??= (await rest(`config_empresa?id=eq.1&select=${CAMPOS_CONFIG}`))[0];
  }

  return [
    {
      nome: 'admin-clientes/admin-config: sem token -> 401; token de usuário que não é admin -> 403',
      async executar() {
        await preparar();
        const comum = { access_token: await tokenDoGoTrue(emailDe('comum')) };
        for (const funcao of ['admin-clientes', 'admin-config']) {
          igual((await chamar(funcao, { acao: 'obter' })).status, 401, `${funcao} sem token`);
          const r = await chamar(
            funcao,
            { acao: 'obter', id: est.idA },
            { headers: bearer(comum) },
          );
          igual(r.status, 403, `${funcao} não-admin`);
        }
        const logo = await enviarLogo(comum, bytesPng());
        igual(logo.status, 403, 'logo por não-admin');
      },
    },
    {
      nome: 'funções removidas (auth-cadastro e cliente-perfil) -> 404',
      async executar() {
        for (const funcao of ['auth-cadastro', 'cliente-perfil']) {
          igual((await chamar(funcao, {})).status, 404, funcao);
        }
      },
    },
    {
      nome: 'admin-clientes criar PF mínima (só tipo e nome): documento null; segundo sem documento também cria',
      async executar() {
        const a = await criarCliente({ tipo_pessoa: 'PF', nome: `Sem Doc 1 ${sufixo}` });
        igual(a.cpf_cnpj, null, 'cpf_cnpj null');
        igual(a.observacoes, '', 'observações vazias');
        const b = await criarCliente({
          tipo_pessoa: 'PF',
          nome: `Sem Doc 2 ${sufixo}`,
          cpf_cnpj: '',
        });
        igual(b.cpf_cnpj, null, 'cpf_cnpj vazio vira null');
        const [linha] = await rest(`clientes?id=eq.${b.id}&select=cpf_cnpj`);
        igual(linha.cpf_cnpj, null, 'null no banco (nunca string vazia)');
        est.semDoc = a.id;
      },
    },
    {
      nome: 'admin-clientes criar PJ com razão social, fantasia e CNPJ; PJ sem razão social -> 400',
      async executar() {
        const pj = await criarCliente({
          tipo_pessoa: 'PJ',
          nome: `Responsável ${sufixo}`,
          razao_social: 'Empresa Teste Ltda',
          nome_fantasia: `Fantasia ${sufixo}`,
          cpf_cnpj: cnpjA,
        });
        igual(pj.razao_social, 'Empresa Teste Ltda', 'razão social');
        igual(pj.nome_fantasia, `Fantasia ${sufixo}`, 'nome fantasia');
        afirmar(pj.cpf_cnpj.includes('/'), 'CNPJ formatado');
        est.idPj = pj.id;
        const ruim = await clientes({
          acao: 'criar',
          dados: { tipo_pessoa: 'PJ', nome: 'Sem Razão' },
        });
        igual(ruim.status, 400, 'status');
        afirmar(ruim.json.campos?.razao_social, 'campos.razao_social');
      },
    },
    {
      nome: 'admin-clientes criar: dados inválidos -> 400 com campos; documento duplicado -> 409',
      async executar() {
        const ruim = await clientes({
          acao: 'criar',
          dados: { tipo_pessoa: 'PF', nome: '', cpf_cnpj: '111', email: 'x', uf: 'XX' },
        });
        igual(ruim.status, 400, 'status');
        for (const k of ['nome', 'cpf_cnpj', 'email', 'uf']) afirmar(ruim.json.campos?.[k], k);
        const dup = await clientes({
          acao: 'criar',
          dados: fichaPf(`dup${sufixo}`, { cpf_cnpj: cpfA }),
        });
        igual(dup.status, 409, 'status duplicado');
        igual(dup.json.campos?.cpf_cnpj, MSG_DOCUMENTO_DUPLICADO, 'mensagem');
      },
    },
    {
      nome: 'admin-clientes listar: busca por nome, fantasia, e-mail (sem repetir) e por dígitos do CPF/telefone',
      async executar() {
        const porNome = sucesso(await clientes({ acao: 'listar', busca: `CLIENTE ${rotuloA}` }));
        igual(porNome.total, 1, 'total por nome');
        const item = porNome.itens[0];
        igual(item.id, est.idA, 'id');
        igual(item.cpf_cnpj, formatarCpfTeste(cpfA), 'cpf formatado');
        igual(item.telefone, '(81) 98888-7777', 'telefone formatado');
        igual(item.email, emailDe(rotuloA), 'email');
        for (const k of ['nome', 'tipo_pessoa', 'razao_social', 'nome_fantasia', 'cidade', 'uf']) {
          afirmar(k in item, `campo ${k} ausente`);
        }
        afirmar(!('observacoes' in item), 'observações não vão na lista');
        const nomeEEmail = sucesso(await clientes({ acao: 'listar', busca: rotuloA }));
        igual(nomeEEmail.total, 1, 'nome e e-mail sem repetir');
        const porEmail = sucesso(await clientes({ acao: 'listar', busca: emailDe(rotuloB) }));
        igual(porEmail.itens[0]?.id, est.idB, 'por e-mail');
        const porFantasia = sucesso(
          await clientes({ acao: 'listar', busca: `fantasia ${sufixo}` }),
        );
        igual(porFantasia.itens[0]?.id, est.idPj, 'por nome fantasia');
        const porRazao = sucesso(await clientes({ acao: 'listar', busca: 'Empresa Teste Ltda' }));
        afirmar(
          porRazao.itens.some((c) => c.id === est.idPj),
          'por razão social',
        );
        const mascarado = sucesso(
          await clientes({ acao: 'listar', busca: formatarCpfTeste(cpfB) }),
        );
        igual(mascarado.total, 1, 'por CPF mascarado');
        igual(mascarado.itens[0].id, est.idB, 'id por CPF');
        const parcial = sucesso(await clientes({ acao: 'listar', busca: cpfA.slice(0, 9) }));
        afirmar(
          parcial.itens.some((c) => c.id === est.idA),
          'CPF parcial não achou',
        );
        const porTelefone = sucesso(await clientes({ acao: 'listar', busca: '(81) 98888-7777' }));
        afirmar(
          porTelefone.itens.some((c) => c.id === est.idA),
          'telefone não achou',
        );
        const nada = sucesso(await clientes({ acao: 'listar', busca: `zzz-${sufixo}-%_` }));
        igual(nada.total, 0, 'sem resultado');
      },
    },
    {
      nome: 'admin-clientes listar: sem busca devolve total de todos, pagina (24 por página); página inválida -> 400',
      async executar() {
        const cadastrados = (await rest('clientes?select=id')).length;
        const p1 = sucesso(await clientes({ acao: 'listar', pagina: 1 }));
        igual(p1.total, cadastrados, 'total = todos os cadastrados');
        igual(p1.itens.length, Math.min(24, cadastrados), 'tamanho da página');
        const alem = sucesso(await clientes({ acao: 'listar', pagina: 9999 }));
        igual(alem.itens.length, 0, 'além do fim');
        igual(alem.total, cadastrados, 'total além do fim');
        igual((await clientes({ acao: 'listar', pagina: 0 })).status, 400, 'página 0');
        igual((await clientes({ acao: 'xyz' })).status, 400, 'ação inválida');
      },
    },
    {
      nome: 'admin-clientes obter: ficha completa com observações; id inválido -> 400; inexistente -> 404',
      async executar() {
        const c = sucesso(await clientes({ acao: 'obter', id: est.idA }));
        igual(c.cpf_cnpj, formatarCpfTeste(cpfA), 'cpf formatado');
        igual(c.observacoes, 'Paga no dia 10', 'observações');
        const campos = [
          'tipo_pessoa',
          'nome',
          'nome_fantasia',
          'razao_social',
          'telefone',
          'email',
        ];
        for (const k of [...campos, 'cep', 'rua', 'numero', 'bairro', 'cidade', 'uf']) {
          afirmar(k in c, `campo ${k} ausente`);
        }
        igual((await clientes({ acao: 'obter', id: 'abc' })).status, 400, 'id inválido');
        igual((await clientes({ acao: 'obter', id: UUID_INEXISTENTE })).status, 404, 'inexistente');
      },
    },
    {
      nome: 'admin-clientes editar: CPF já usado por outro cliente -> 409 em campos.cpf_cnpj',
      async executar() {
        const r = await editarA({ cpf_cnpj: formatarCpfTeste(cpfB) });
        igual(r.status, 409, 'status');
        igual(r.json.campos?.cpf_cnpj, MSG_DOCUMENTO_DUPLICADO, 'mensagem');
        const c = sucesso(await clientes({ acao: 'obter', id: est.idA }));
        igual(c.cpf_cnpj, formatarCpfTeste(cpfA), 'documento mantido');
      },
    },
    {
      nome: 'admin-clientes editar: nome, telefone, e-mail e observações ok; campos inválidos e vazio -> 400',
      async executar() {
        const c = sucesso(
          await editarA({
            nome: 'Nome Editado',
            telefone: '(81) 98888-6666',
            email: `Novo-${sufixo}@Example.com`,
            observacoes: 'Nova observação',
          }),
        );
        igual(c.nome, 'Nome Editado', 'nome');
        igual(c.telefone, '81988886666', 'telefone em dígitos');
        igual(c.email, `novo-${sufixo}@example.com`, 'e-mail normalizado');
        igual(c.observacoes, 'Nova observação', 'observações');
        igual((await editarA({ email: 'sem-arroba' })).status, 400, 'e-mail inválido');
        igual((await editarA({ uf: 'XX' })).status, 400, 'uf inválida');
        igual((await editarA({})).status, 400, 'nada para alterar');
        igual(
          (await clientes({ acao: 'editar', id: UUID_INEXISTENTE, dados: { nome: 'x' } })).status,
          404,
          '404',
        );
      },
    },
    {
      nome: 'admin-clientes editar: apagar o documento -> null; PF -> PJ sem razão social ou com documento incompatível -> 400',
      async executar() {
        const semDoc = sucesso(await editarA({ cpf_cnpj: '' }));
        igual(semDoc.cpf_cnpj, null, 'documento apagado');
        const semRazao = await editarA({ tipo_pessoa: 'PJ', cpf_cnpj: cnpjA });
        igual(semRazao.status, 400, 'sem razão social');
        const soTipo = await editarA({ tipo_pessoa: 'PJ', razao_social: 'Empresa Teste Ltda' });
        igual(soTipo.status, 200, 'sem documento, o tipo pode mudar');
        const cpfEmPj = await editarA({ cpf_cnpj: cpfA });
        igual(cpfEmPj.status, 400, 'CPF em PJ');
        afirmar(cpfEmPj.json.campos?.cpf_cnpj, 'campos.cpf_cnpj (CPF em PJ)');
        const semRazaoPj = await editarA({ razao_social: '' });
        igual(semRazaoPj.status, 400, 'PJ sem razão social');
        afirmar(semRazaoPj.json.campos?.razao_social, 'campos.razao_social');
      },
    },
    {
      nome: 'admin-clientes editar: PJ -> PF com CPF limpa razão social e nome fantasia; só o tipo com CNPJ guardado -> 400',
      async executar() {
        const pj = sucesso(
          await clientes({
            acao: 'editar',
            id: est.idPj,
            dados: { nome_fantasia: `Fantasia ${sufixo}` },
          }),
        );
        igual(pj.tipo_pessoa, 'PJ', 'continua PJ');
        const soTipo = await clientes({
          acao: 'editar',
          id: est.idPj,
          dados: { tipo_pessoa: 'PF' },
        });
        igual(soTipo.status, 400, 'CNPJ guardado não vale para PF');
        afirmar(soTipo.json.campos?.cpf_cnpj, 'campos.cpf_cnpj (tipo)');
        const pf = sucesso(
          await clientes({
            acao: 'editar',
            id: est.idPj,
            dados: { tipo_pessoa: 'PF', cpf_cnpj: gerarCpf(SEMENTE_CPF + 23) },
          }),
        );
        igual(pf.tipo_pessoa, 'PF', 'virou PF');
        igual(pf.razao_social, null, 'razão social limpa');
        igual(pf.nome_fantasia, null, 'nome fantasia limpo');
      },
    },
    {
      nome: 'admin-clientes excluir: remove a ficha e o total cai; inexistente ou id inválido -> erro',
      async executar() {
        const antes = sucesso(await clientes({ acao: 'listar' })).total;
        sucesso(await clientes({ acao: 'excluir', id: est.semDoc }));
        const depois = sucesso(await clientes({ acao: 'listar' })).total;
        igual(depois, antes - 1, 'total após excluir');
        igual((await clientes({ acao: 'obter', id: est.semDoc })).status, 404, 'obter excluído');
        igual((await clientes({ acao: 'excluir', id: est.semDoc })).status, 404, 'excluir de novo');
        igual((await clientes({ acao: 'excluir', id: 'abc' })).status, 400, 'id inválido');
      },
    },
    {
      nome: 'admin-config editar + obter: round-trip com WhatsApp normalizado e CNPJ em dígitos',
      async executar() {
        const salvo = sucesso(
          await config({
            acao: 'editar',
            nome: `Empresa ${sufixo}`,
            cnpj: '11.222.333/0001-81',
            whatsapp: '(81) 99999-0000',
            endereco: 'Rua das Flores, 10',
            rodape_mensagem: 'Obrigado & volte sempre!',
          }),
        );
        igual(salvo.whatsapp, '5581999990000', 'whatsapp normalizado');
        igual(salvo.cnpj, CNPJ_CONFIG, 'cnpj em dígitos');
        const lido = sucesso(await config({ acao: 'obter' }));
        igual(lido.nome, `Empresa ${sufixo}`, 'nome');
        igual(lido.endereco, 'Rua das Flores, 10', 'endereço');
        igual(lido.rodape_mensagem, 'Obrigado & volte sempre!', 'rodapé');
        igual(lido.whatsapp, '5581999990000', 'whatsapp lido');
        afirmar('logo_url' in lido, 'logo_url ausente');
        const publica = (await chamar('config-publica', {})).json.dados;
        igual(publica.nome, `Empresa ${sufixo}`, 'config-publica nome');
        igual(publica.whatsapp, '5581999990000', 'config-publica whatsapp');
      },
    },
    {
      nome: 'admin-config editar: email_privacidade válido aparece em config-publica; vazio vira null; inválido -> 400',
      async executar() {
        const salvo = sucesso(
          await config({ acao: 'editar', email_privacidade: ' Privacidade@Loja.com ' }),
        );
        igual(salvo.email_privacidade, 'privacidade@loja.com', 'normalizado');
        const publica = (await chamar('config-publica', {})).json.dados;
        igual(publica.email_privacidade, 'privacidade@loja.com', 'config-publica');
        const ruim = await config({ acao: 'editar', email_privacidade: 'sem-arroba' });
        igual(ruim.status, 400, 'inválido');
        afirmar(ruim.json.campos?.email_privacidade, 'campos.email_privacidade');
        const limpo = sucesso(await config({ acao: 'editar', email_privacidade: '' }));
        igual(limpo.email_privacidade, null, 'vazio vira null');
        igual((await chamar('config-publica', {})).json.dados.email_privacidade, null, 'publica');
      },
    },
    {
      nome: 'admin-config editar: WhatsApp (81) 9999 -> 400; CNPJ inválido -> 400; nome vazio -> 400',
      async executar() {
        const zap = await config({ acao: 'editar', whatsapp: '(81) 9999' });
        igual(zap.status, 400, 'whatsapp');
        afirmar(zap.json.campos?.whatsapp, 'campos.whatsapp');
        const cnpj = await config({ acao: 'editar', cnpj: '11.222.333/0001-80' });
        igual(cnpj.status, 400, 'cnpj');
        afirmar(cnpj.json.campos?.cnpj, 'campos.cnpj');
        igual((await config({ acao: 'editar', nome: ' ' })).status, 400, 'nome');
        igual((await config({ acao: 'editar' })).status, 400, 'nada para alterar');
        igual((await config({ acao: 'xyz' })).status, 400, 'ação inválida');
        const lido = sucesso(await config({ acao: 'obter' }));
        igual(lido.whatsapp, '5581999990000', 'valor anterior preservado');
      },
    },
    {
      nome: 'admin-config enviar_logo: PNG vira logo_url acessível (também em config-publica)',
      async executar() {
        const sessao = await sessaoAdmin();
        const r = await enviarLogo(sessao, bytesPng());
        const logo = sucesso(r);
        afirmar(logo.logo_url?.includes('/config/logo-'), `logo_url (${logo.logo_url})`);
        afirmar(logo.logo_url.endsWith('.png'), 'extensão');
        est.logo1 = logo.logo_url;
        dados.logosTeste.push(est.logo1.split(CAMINHO_PUBLICO_FOTOS)[1]);
        igual(await statusDaFoto(est.logo1), 200, 'logo acessível');
        const publica = (await chamar('config-publica', {})).json.dados;
        igual(publica.logo_url, est.logo1, 'config-publica logo_url');
        igual(sucesso(await config({ acao: 'obter' })).logo_url, est.logo1, 'obter logo_url');
      },
    },
    {
      nome: 'admin-config enviar_logo: arquivo inválido -> 400; novo logo remove o anterior',
      async executar() {
        const sessao = await sessaoAdmin();
        const texto = await enviarLogo(
          sessao,
          new TextEncoder().encode('não sou imagem'),
          'image/png',
        );
        igual(texto.status, 400, 'não imagem');
        const grande = await enviarLogo(sessao, new Uint8Array(5 * 1024 * 1024 + 1).fill(1));
        afirmar(grande.status === 400 || grande.status === 413, `grande (${grande.status})`);
        igual(await statusDaFoto(est.logo1), 200, 'logo anterior intacto após falhas');
        const logo = sucesso(await enviarLogo(sessao, bytesPng()));
        dados.logosTeste.push(logo.logo_url.split(CAMINHO_PUBLICO_FOTOS)[1]);
        afirmar(logo.logo_url !== est.logo1, 'novo caminho');
        igual(await statusDaFoto(logo.logo_url), 200, 'novo acessível');
        afirmar((await statusDaFoto(est.logo1)) !== 200, 'logo anterior ainda existe');
        const publica = (await chamar('config-publica', {})).json.dados;
        igual(publica.logo_url, logo.logo_url, 'config-publica atualizado');
      },
    },
    {
      nome: 'admin-categorias: nomes longos (>= 59 caracteres) repetidos geram slugs distintos',
      async executar() {
        const nome = `${'q'.repeat(59)}${sufixo}`;
        const slugs = new Set();
        for (let i = 0; i < 4; i += 1) {
          const c = sucesso(await comoAdmin('admin-categorias', { acao: 'criar', nome }));
          dados.categoriasSlug.push(c.id);
          afirmar(c.slug.length <= 60, 'tamanho do slug');
          slugs.add(c.slug);
        }
        igual(slugs.size, 4, 'slugs distintos');
      },
    },
  ];
}

// ---------- execução ----------

async function principal() {
  let falhas = 0;
  try {
    await semear();
    await semearAuth();
    for (const caso of casos) {
      try {
        await caso.executar();
        console.log(`PASS  ${caso.nome}`);
      } catch (e) {
        falhas += 1;
        console.log(`FAIL  ${caso.nome}\n      ${e.message}`);
      }
    }
  } catch (e) {
    falhas += 1;
    console.log(`FAIL  preparação dos dados\n      ${e.message}`);
  } finally {
    try {
      await limparAdmin();
      await limparAdmin10();
      await limparAuth();
      await limpar();
    } catch (e) {
      console.log(`AVISO falha ao limpar dados: ${e.message}`);
    }
  }
  console.log(`\n${falhas ? `${falhas} falha(s)` : `Todos os ${casos.length} casos passaram`}.`);
  process.exit(falhas ? 1 : 0);
}

principal();
