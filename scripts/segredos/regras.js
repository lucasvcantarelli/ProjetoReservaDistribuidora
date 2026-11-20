// Regras puras do verificador de segredos (testadas em regras.test.js).
// O repositório é público: nada de chaves, .env reais, dados reais de clientes/empresa
// ou o caminho secreto do painel pode entrar em um commit.

// Arquivos .env que PODEM ir para o repositório (só valores fictícios/locais).
const ENV_PERMITIDOS = new Set(['.env.example', '.env.production.example', '.env.verificacao']);

const ARQUIVOS_PROIBIDOS = [
  {
    teste: (nome) => /^\.env(\..+)?$/i.test(nome) && !ENV_PERMITIDOS.has(nome),
    motivo: 'arquivo .env real',
  },
  { teste: (nome) => /\.(pem|key|p12|pfx|jks|keystore)$/i.test(nome), motivo: 'chave/certificado' },
  { teste: (nome) => /^id_(rsa|ed25519|ecdsa)/i.test(nome), motivo: 'chave SSH' },
  { teste: (nome) => nome === '.segredos-locais', motivo: 'lista local de dados reais' },
];

const PROVEDORES_EMAIL_REAIS =
  'gmail|googlemail|hotmail|outlook|live|msn|yahoo|icloud|me|uol|bol|terra|ig|globo|locaweb|protonmail|proton';

const PADROES = [
  {
    regra: 'token JWT (chave anon/service_role ou sessão)',
    re: /eyJ[\w-]{10,}\.eyJ[\w-]{10,}\.[\w-]{10,}/,
  },
  {
    regra: 'chave do Supabase (sb_secret/sb_publishable)',
    re: /sb_(secret|publishable)_[\w-]{10,}/,
  },
  { regra: 'token de acesso do Supabase (sbp_)', re: /sbp_[a-f0-9]{30,}/ },
  { regra: 'URL de projeto real do Supabase', re: /[a-z0-9]{20}\.supabase\.(co|in)/ },
  { regra: 'chave privada', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { regra: 'token do GitHub', re: /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}|github_pat_[\w]{30,}/ },
  { regra: 'chave da AWS', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { regra: 'chave do Google', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { regra: 'chave do Stripe', re: /\b(sk|rk)_live_[0-9A-Za-z]{10,}/ },
  { regra: 'chave da OpenAI/Anthropic', re: /\bsk-(ant-|proj-)?[A-Za-z0-9_-]{20,}/ },
  {
    regra: 'string de conexão com senha (banco remoto)',
    re: /postgres(ql)?:\/\/[^:\s/]+:[^@\s]+@(?!(127\.0\.0\.1|localhost|db)[:/])/i,
  },
  {
    regra: 'senha/chave atribuída diretamente',
    // Ignora quando o valor vem de variável de ambiente (process.env/Deno.env/import.meta.env/env()).
    re: /\b[A-Z0-9_]*(SERVICE_ROLE|ANON_KEY|SMTP_PASS|PASSWORD|SECRET|API_KEY|ACCESS_TOKEN)[A-Z0-9_]*\s*[=:]\s*['"]?(?!env\(|<|\$\{|your|seu|sua|exemplo|example|process\.env|Deno\.env|import\.meta\.env)[^\s'"#]{8,}/,
  },
  {
    regra: 'e-mail pessoal/real',
    re: new RegExp(`[\\w.+-]+@(${PROVEDORES_EMAIL_REAIS})\\.(com|com\\.br|net|org|br)\\b`, 'i'),
  },
];

const nomeDoArquivo = (caminho) => caminho.split(/[\\/]/).pop();

export function motivoArquivoProibido(caminho) {
  const nome = nomeDoArquivo(caminho);
  if (/(^|\/)supabase\/\.(temp|branches)\//.test(caminho)) return 'pasta local do Supabase CLI';
  return ARQUIVOS_PROIBIDOS.find((r) => r.teste(nome))?.motivo ?? null;
}

// Valores que não identificam nada (locais/genéricos) e por isso não precisam ser bloqueados.
function valorGenerico(valor) {
  return (
    valor.length < 6 ||
    /^(true|false|null|\d+)$/i.test(valor) ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(valor) ||
    /painel-exemplo|seudominio|<.*>/i.test(valor)
  );
}

// Extrai os valores de um arquivo .env local (e da lista .segredos-locais) para bloquear
// qualquer um deles que apareça no conteúdo commitado.
export function valoresDoEnv(texto) {
  const valores = new Set();
  for (const linhaBruta of texto.split(/\r?\n/)) {
    const linha = linhaBruta.trim();
    if (!linha || linha.startsWith('#')) continue;
    const valor = linha.includes('=') ? linha.slice(linha.indexOf('=') + 1) : linha;
    for (const parte of valor.replace(/^['"]|['"]$/g, '').split(',')) {
      const v = parte.trim();
      if (valorGenerico(v)) continue;
      valores.add(v);
      // Caminho do painel: bloqueia também sem as barras ("/adm-xyz/" -> "adm-xyz").
      const semBarras = v.replace(/^\/+|\/+$/g, '');
      if (v.startsWith('/') && !valorGenerico(semBarras)) valores.add(semBarras);
    }
  }
  return valores;
}

// Mostra só o começo do achado, para o relatório não reexibir o segredo inteiro.
const mascarar = (trecho) =>
  trecho.length <= 6 ? '***' : `${trecho.slice(0, 4)}…(${trecho.length} car.)`;

export function procurarSegredos(texto, { valoresLocais = new Set() } = {}) {
  const achados = [];
  const linhas = texto.split(/\r?\n/);
  linhas.forEach((linha, i) => {
    for (const { regra, re } of PADROES) {
      const m = linha.match(re);
      if (m) achados.push({ linha: i + 1, regra, trecho: mascarar(m[0]) });
    }
    for (const valor of valoresLocais) {
      if (linha.includes(valor)) {
        achados.push({
          linha: i + 1,
          regra: 'valor de um .env local / .segredos-locais',
          trecho: mascarar(valor),
        });
      }
    }
  });
  return achados;
}
