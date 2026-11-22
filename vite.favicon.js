import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Favicon da loja e do painel: a imagem da marca do cliente fica em `marca-local/favicon.png`,
// pasta fora do Git (o repositório é público). Sem o arquivo, o build segue sem favicon.
export const PASTA_MARCA = 'marca-local';
export const ARQUIVO_FAVICON = 'favicon.png';
const ASSINATURA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function ehPng(bytes) {
  return bytes.length >= ASSINATURA_PNG.length && ASSINATURA_PNG.every((b, i) => bytes[i] === b);
}

// `base`: '/' na loja, o caminho secreto no painel.
export function tagsFavicon(base) {
  const href = `${base}${ARQUIVO_FAVICON}`;
  return [
    { tag: 'link', attrs: { rel: 'icon', type: 'image/png', href }, injectTo: 'head' },
    { tag: 'link', attrs: { rel: 'apple-touch-icon', href }, injectTo: 'head' },
  ];
}

// -> bytes do PNG, ou null se o arquivo não existir.
export async function lerFavicon(raiz) {
  const caminho = join(raiz, PASTA_MARCA, ARQUIVO_FAVICON);
  let bytes;
  try {
    bytes = await readFile(caminho);
  } catch (erro) {
    if (erro.code === 'ENOENT') return null;
    throw erro;
  }
  if (!ehPng(bytes)) {
    throw new Error(
      `${PASTA_MARCA}/${ARQUIVO_FAVICON} precisa ser uma imagem PNG (quadrada, 512x512).`,
    );
  }
  return bytes;
}

export function favicon() {
  let config;
  let bytes = null;
  return {
    name: 'favicon',
    async configResolved(resolvida) {
      config = resolvida;
      bytes = await lerFavicon(config.root);
      if (!bytes && config.command === 'build' && config.mode === 'production') {
        config.logger.warn(
          `Sem ${PASTA_MARCA}/${ARQUIVO_FAVICON}: o site vai sem favicon (veja o README).`,
        );
      }
    },
    configureServer(servidor) {
      servidor.middlewares.use((req, res, proximo) => {
        if (!bytes || req.url?.split('?')[0] !== `${config.base}${ARQUIVO_FAVICON}`)
          return proximo();
        res.setHeader('Content-Type', 'image/png');
        res.end(bytes);
      });
    },
    transformIndexHtml() {
      return bytes ? tagsFavicon(config.base) : [];
    },
    generateBundle() {
      if (bytes) this.emitFile({ type: 'asset', fileName: ARQUIVO_FAVICON, source: bytes });
    },
  };
}
