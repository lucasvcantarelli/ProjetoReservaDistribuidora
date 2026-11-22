import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ARQUIVO_FAVICON, PASTA_MARCA, ehPng, lerFavicon, tagsFavicon } from './vite.favicon.js';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);

describe('favicon', () => {
  let raiz;
  afterEach(() => raiz && rm(raiz, { recursive: true, force: true }));

  it('fica em marca-local/favicon.png (pasta fora do Git)', () => {
    expect(PASTA_MARCA).toBe('marca-local');
    expect(ARQUIVO_FAVICON).toBe('favicon.png');
  });

  it('reconhece PNG pelos bytes', () => {
    expect(ehPng(PNG)).toBe(true);
    expect(ehPng(Buffer.from('<svg></svg>'))).toBe(false);
    expect(ehPng(Buffer.alloc(0))).toBe(false);
  });

  it('gera as tags com o caminho do site (loja na raiz, painel no caminho secreto)', () => {
    expect(tagsFavicon('/')).toEqual([
      {
        tag: 'link',
        attrs: { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        injectTo: 'head',
      },
      { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/favicon.png' }, injectTo: 'head' },
    ]);
    expect(tagsFavicon('/painel-exemplo/')[0].attrs.href).toBe('/painel-exemplo/favicon.png');
  });

  it('sem o arquivo devolve null; com PNG devolve os bytes; outro formato é erro claro', async () => {
    raiz = await mkdtemp(join(tmpdir(), 'favicon-'));
    expect(await lerFavicon(raiz)).toBeNull();
    await mkdir(join(raiz, PASTA_MARCA));
    await writeFile(join(raiz, PASTA_MARCA, ARQUIVO_FAVICON), PNG);
    expect(await lerFavicon(raiz)).toEqual(PNG);
    await writeFile(join(raiz, PASTA_MARCA, ARQUIVO_FAVICON), 'não sou png');
    await expect(lerFavicon(raiz)).rejects.toThrow(/precisa ser uma imagem PNG/);
  });
});
