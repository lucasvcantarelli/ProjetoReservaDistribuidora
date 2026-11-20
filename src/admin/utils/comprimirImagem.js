import { LIMITE_IMAGEM_BYTES } from '../../../supabase/functions/_shared/domain/imagem.js';

export const LADO_MAXIMO_PADRAO = 1200;
export const QUALIDADE_WEBP = 0.8;
export const QUALIDADE_JPEG = 0.85;

const TIPO_WEBP = 'image/webp';
const TIPO_JPEG = 'image/jpeg';
const FUNDO_JPEG = '#ffffff';

export const MSG_NAO_E_IMAGEM = 'Este arquivo não é uma imagem. Envie uma foto JPG, PNG ou WebP.';
export const MSG_IMAGEM_ILEGIVEL = 'Não foi possível ler esta imagem. Tente outra foto.';
export const MSG_IMAGEM_GRANDE_DEMAIS =
  'Mesmo comprimida, a imagem passa de 5 MB. Use uma foto menor.';

// Reduz (nunca amplia) mantendo a proporção, para que o lado maior fique em `ladoMax`.
export function calcularDimensoes(largura, altura, ladoMax = LADO_MAXIMO_PADRAO) {
  const maior = Math.max(largura, altura);
  if (maior <= ladoMax) return { w: largura, h: altura };
  const fator = ladoMax / maior;
  return {
    w: Math.max(1, Math.round(largura * fator)),
    h: Math.max(1, Math.round(altura * fator)),
  };
}

async function codificar(bitmap, { w, h }, tipo, qualidade) {
  const fundo = tipo === TIPO_JPEG ? FUNDO_JPEG : null; // JPEG não tem transparência
  if (typeof OffscreenCanvas !== 'undefined') {
    const tela = new OffscreenCanvas(w, h);
    desenhar(tela.getContext('2d'), bitmap, w, h, fundo);
    return tela.convertToBlob({ type: tipo, quality: qualidade });
  }
  const tela = document.createElement('canvas');
  tela.width = w;
  tela.height = h;
  desenhar(tela.getContext('2d'), bitmap, w, h, fundo);
  return new Promise((resolver) => tela.toBlob(resolver, tipo, qualidade));
}

function desenhar(contexto, bitmap, w, h, fundo) {
  if (fundo) {
    contexto.fillStyle = fundo;
    contexto.fillRect(0, 0, w, h);
  }
  contexto.drawImage(bitmap, 0, 0, w, h);
}

// Navegador sem suporte a WebP devolve null ou outro tipo (PNG): aí cai para JPEG.
async function codificarComFallback(bitmap, dimensoes, qualidade) {
  const webp = await codificar(bitmap, dimensoes, TIPO_WEBP, qualidade);
  if (webp && webp.type === TIPO_WEBP) return webp;
  return codificar(bitmap, dimensoes, TIPO_JPEG, QUALIDADE_JPEG);
}

async function abrirImagem(arquivo) {
  try {
    return await createImageBitmap(arquivo, { imageOrientation: 'from-image' }); // respeita a rotação do celular
  } catch {
    throw new Error(MSG_IMAGEM_ILEGIVEL);
  }
}

// Foto -> WebP com o lado maior em até `ladoMax` px (JPEG se o navegador não gera WebP).
export async function comprimirImagem(
  arquivo,
  { ladoMax = LADO_MAXIMO_PADRAO, qualidade = QUALIDADE_WEBP } = {},
) {
  if (!arquivo?.type?.startsWith('image/')) throw new Error(MSG_NAO_E_IMAGEM);
  const bitmap = await abrirImagem(arquivo);
  try {
    const dimensoes = calcularDimensoes(bitmap.width, bitmap.height, ladoMax);
    const blob = await codificarComFallback(bitmap, dimensoes, qualidade);
    if (!blob) throw new Error(MSG_IMAGEM_ILEGIVEL);
    if (blob.size > LIMITE_IMAGEM_BYTES) throw new Error(MSG_IMAGEM_GRANDE_DEMAIS);
    return blob;
  } finally {
    bitmap.close?.();
  }
}
