import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MSG_IMAGEM_GRANDE_DEMAIS,
  MSG_NAO_E_IMAGEM,
  calcularDimensoes,
  comprimirImagem,
} from './comprimirImagem.js';

describe('calcularDimensoes', () => {
  it('reduz mantendo a proporção: 4000x3000 -> 1200x900', () => {
    expect(calcularDimensoes(4000, 3000, 1200)).toEqual({ w: 1200, h: 900 });
  });

  it('usa o lado maior também em fotos em pé', () => {
    expect(calcularDimensoes(3000, 4000, 1200)).toEqual({ w: 900, h: 1200 });
  });

  it('não amplia imagem menor', () => {
    expect(calcularDimensoes(800, 600, 1200)).toEqual({ w: 800, h: 600 });
    expect(calcularDimensoes(1200, 1200, 1200)).toEqual({ w: 1200, h: 1200 });
  });

  it('nunca devolve lado zero', () => {
    expect(calcularDimensoes(10000, 1, 1200)).toEqual({ w: 1200, h: 1 });
  });
});

describe('comprimirImagem', () => {
  const arquivo = new File(['x'], 'foto.png', { type: 'image/png' });

  function simularNavegador({ toBlob }) {
    const contexto = { drawImage: vi.fn(), fillRect: vi.fn() };
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 4000, height: 3000, close: vi.fn() }),
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(contexto);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(toBlob);
    return contexto;
  }

  afterEach(() => vi.unstubAllGlobals());

  it('gera WebP com qualidade 0.8 no tamanho reduzido', async () => {
    const webp = new Blob(['w'], { type: 'image/webp' });
    let tamanho;
    const chamadas = [];
    simularNavegador({
      toBlob(callback, tipo, qualidade) {
        tamanho = [this.width, this.height];
        chamadas.push([tipo, qualidade]);
        callback(webp);
      },
    });
    await expect(comprimirImagem(arquivo)).resolves.toBe(webp);
    expect(tamanho).toEqual([1200, 900]);
    expect(chamadas).toEqual([['image/webp', 0.8]]);
  });

  it('cai para JPEG 0.85 quando o navegador não codifica WebP (null)', async () => {
    const jpeg = new Blob(['j'], { type: 'image/jpeg' });
    const chamadas = [];
    simularNavegador({
      toBlob(callback, tipo, qualidade) {
        chamadas.push([tipo, qualidade]);
        callback(tipo === 'image/webp' ? null : jpeg);
      },
    });
    await expect(comprimirImagem(arquivo)).resolves.toBe(jpeg);
    expect(chamadas).toEqual([
      ['image/webp', 0.8],
      ['image/jpeg', 0.85],
    ]);
  });

  it('cai para JPEG quando o navegador devolve PNG no lugar do WebP', async () => {
    const jpeg = new Blob(['j'], { type: 'image/jpeg' });
    simularNavegador({
      toBlob: (callback, tipo) =>
        callback(tipo === 'image/webp' ? new Blob(['p'], { type: 'image/png' }) : jpeg),
    });
    await expect(comprimirImagem(arquivo)).resolves.toBe(jpeg);
  });

  it('recusa arquivo que não é imagem', async () => {
    await expect(
      comprimirImagem(new File(['x'], 'a.pdf', { type: 'application/pdf' })),
    ).rejects.toThrow(MSG_NAO_E_IMAGEM);
  });

  it('recusa imagem que continua acima de 5 MB', async () => {
    const grande = { size: 5 * 1024 * 1024 + 1, type: 'image/webp' };
    simularNavegador({ toBlob: (callback) => callback(grande) });
    await expect(comprimirImagem(arquivo)).rejects.toThrow(MSG_IMAGEM_GRANDE_DEMAIS);
  });

  it('traduz falha ao decodificar em mensagem em português', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('x')));
    await expect(comprimirImagem(arquivo)).rejects.toThrow('Não foi possível ler esta imagem.');
  });
});
