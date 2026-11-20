import { describe, expect, it } from 'vitest';
import {
  LIMITE_IMAGEM_BYTES,
  MSG_IMAGEM_GRANDE,
  MSG_IMAGEM_TIPO,
  MSG_IMAGEM_VAZIA,
  validarImagem,
} from './imagem.js';

const ascii = (t) => [...t].map((c) => c.charCodeAt(0));
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const WEBP = Uint8Array.from([...ascii('RIFF'), 1, 2, 3, 4, ...ascii('WEBP'), 0]);

describe('validarImagem', () => {
  it('detecta jpg, png e webp pela assinatura', () => {
    expect(validarImagem(JPEG)).toEqual({ ok: true, ext: 'jpg', contentType: 'image/jpeg' });
    expect(validarImagem(PNG)).toEqual({ ok: true, ext: 'png', contentType: 'image/png' });
    expect(validarImagem(WEBP)).toEqual({ ok: true, ext: 'webp', contentType: 'image/webp' });
  });
  it('rejeita texto, GIF e RIFF que não é WebP', () => {
    const texto = validarImagem(new TextEncoder().encode('isto não é uma imagem'));
    expect(texto).toEqual({ ok: false, erro: MSG_IMAGEM_TIPO });
    expect(validarImagem(Uint8Array.from(ascii('GIF89a....')))).toEqual({
      ok: false,
      erro: MSG_IMAGEM_TIPO,
    });
    const wav = Uint8Array.from([...ascii('RIFF'), 1, 2, 3, 4, ...ascii('WAVE')]);
    expect(validarImagem(wav).ok).toBe(false);
  });
  it('rejeita vazio e arquivo truncado', () => {
    expect(validarImagem(new Uint8Array(0))).toEqual({ ok: false, erro: MSG_IMAGEM_VAZIA });
    expect(validarImagem(Uint8Array.from([0xff, 0xd8])).ok).toBe(false);
    expect(validarImagem(Uint8Array.from(ascii('RIFF'))).ok).toBe(false);
  });
  it('aceita exatamente 5 MB e rejeita acima', () => {
    const limite = new Uint8Array(LIMITE_IMAGEM_BYTES);
    limite.set(JPEG);
    expect(validarImagem(limite).ok).toBe(true);
    const acima = new Uint8Array(LIMITE_IMAGEM_BYTES + 1);
    acima.set(JPEG);
    expect(validarImagem(acima)).toEqual({ ok: false, erro: MSG_IMAGEM_GRANDE });
  });
});
