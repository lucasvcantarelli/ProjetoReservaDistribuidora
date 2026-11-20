// Validação de imagens enviadas: tipo detectado pela assinatura (magic bytes), nunca pelo nome
// nem pelo MIME informado pelo cliente. Módulo puro: sem imports de Deno/npm.

export const LIMITE_IMAGEM_BYTES = 5 * 1024 * 1024;

export const MSG_IMAGEM_VAZIA = 'Arquivo vazio.';
export const MSG_IMAGEM_GRANDE = 'A imagem deve ter no máximo 5 MB.';
export const MSG_IMAGEM_TIPO = 'Formato não suportado. Envie uma imagem JPG, PNG ou WebP.';

const ASSINATURA_JPEG = [0xff, 0xd8, 0xff];
const ASSINATURA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const ASSINATURA_RIFF = [0x52, 0x49, 0x46, 0x46]; // "RIFF"
const ASSINATURA_WEBP = [0x57, 0x45, 0x42, 0x50]; // "WEBP", a partir do byte 8
const POSICAO_WEBP = 8;

function comecaCom(bytes, assinatura, posicao = 0) {
  if (bytes.length < posicao + assinatura.length) return false;
  return assinatura.every((b, i) => bytes[posicao + i] === b);
}

function detectar(bytes) {
  if (comecaCom(bytes, ASSINATURA_JPEG)) return { ext: 'jpg', contentType: 'image/jpeg' };
  if (comecaCom(bytes, ASSINATURA_PNG)) return { ext: 'png', contentType: 'image/png' };
  if (comecaCom(bytes, ASSINATURA_RIFF) && comecaCom(bytes, ASSINATURA_WEBP, POSICAO_WEBP)) {
    return { ext: 'webp', contentType: 'image/webp' };
  }
  return null;
}

/**
 * @param {Uint8Array} bytes Conteúdo do arquivo.
 * @returns {{ok: true, ext: string, contentType: string} | {ok: false, erro: string}}
 */
export function validarImagem(bytes) {
  if (!bytes || bytes.length === 0) return { ok: false, erro: MSG_IMAGEM_VAZIA };
  if (bytes.length > LIMITE_IMAGEM_BYTES) return { ok: false, erro: MSG_IMAGEM_GRANDE };
  const tipo = detectar(bytes);
  if (!tipo) return { ok: false, erro: MSG_IMAGEM_TIPO };
  return { ok: true, ...tipo };
}
