import { db, urlPublica } from '../_shared/infra/db.js';
import { exigirAdmin } from '../_shared/infra/auth.js';
import { falhar, servir } from '../_shared/infra/http.js';
import { lancar } from '../_shared/infra/erroBanco.js';
import { enviarObjeto, removerArquivos } from '../_shared/infra/fotosStorage.js';
import { LIMITE_IMAGEM_BYTES, validarImagem } from '../_shared/domain/imagem.js';
import { validarConfig } from '../_shared/domain/configEmpresa.js';

const COLUNAS = 'nome, cnpj, whatsapp, endereco, rodape_mensagem, email_privacidade, logo_caminho';
const ID_CONFIG = 1;
const LIMITE_MULTIPART_BYTES = LIMITE_IMAGEM_BYTES + 1024 * 1024; // arquivo + campos do formulário
const ACAO_LOGO = 'enviar_logo';

const configPublica = ({ logo_caminho: logoCaminho, ...config }) => ({
  ...config,
  logo_url: urlPublica(logoCaminho),
});

async function lerConfig() {
  const { data, error } = await db()
    .from('config_empresa')
    .select(COLUNAS)
    .eq('id', ID_CONFIG)
    .maybeSingle();
  lancar(error);
  return data ?? {};
}

// Grava só as colunas informadas; `upsert` recria a linha única se ela tiver sumido.
async function gravar(alteracoes) {
  const { data, error } = await db()
    .from('config_empresa')
    .upsert({ id: ID_CONFIG, ...alteracoes })
    .select(COLUNAS)
    .single();
  lancar(error);
  return data;
}

async function obter() {
  return configPublica(await lerConfig());
}

async function editar(corpo) {
  const { nome, cnpj, whatsapp, endereco, rodape_mensagem, email_privacidade } = corpo;
  const resultado = validarConfig({
    nome,
    cnpj,
    whatsapp,
    endereco,
    rodape_mensagem,
    email_privacidade,
  });
  if (!resultado.ok) falhar(400, 'Confira os campos informados.', resultado.campos);
  if (Object.keys(resultado.valor).length === 0) falhar(400, 'Nada para alterar.');
  return configPublica(await gravar(resultado.valor));
}

async function enviarLogo(formulario) {
  const acao = formulario.get('acao');
  if (acao !== null && acao !== ACAO_LOGO) falhar(400, 'Ação inválida.');
  const arquivo = formulario.get('arquivo');
  if (!(arquivo instanceof Blob)) falhar(400, 'Envie uma imagem.');
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const imagem = validarImagem(bytes);
  if (!imagem.ok) falhar(400, imagem.erro);

  const anterior = (await lerConfig()).logo_caminho;
  const caminho = await enviarObjeto(
    `config/logo-${crypto.randomUUID()}.${imagem.ext}`,
    bytes,
    imagem.contentType,
  );
  let config;
  try {
    config = await gravar({ logo_caminho: caminho });
  } catch (e) {
    await removerArquivos([caminho]);
    throw e;
  }
  if (anterior && anterior !== caminho) await removerArquivos([anterior]);
  return configPublica(config);
}

const ACOES = { obter, editar };

servir(
  async (req, corpo, contexto) => {
    await exigirAdmin(req);
    if (contexto.multipart) return enviarLogo(await contexto.formData());
    const acao = Object.hasOwn(ACOES, corpo.acao) ? ACOES[corpo.acao] : null;
    if (!acao) falhar(400, 'Ação inválida.');
    return acao(corpo);
  },
  { aceitarMultipart: true, limiteBytes: LIMITE_MULTIPART_BYTES },
);
