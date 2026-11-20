// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { tratar } from './http.js';

const URL_TESTE = 'http://funcao.local/x';
const LIMITE = 2000;
const OPCOES = { aceitarMultipart: true, limiteBytes: LIMITE };

function reqForm(tamanhoArquivo) {
  const form = new FormData();
  form.set('produto_id', 'abc');
  form.set('arquivo', new Blob([new Uint8Array(tamanhoArquivo)]), 'a.bin');
  return new Request(URL_TESTE, { method: 'POST', body: form });
}

const handlerForm = async (_req, corpo, ctx) => {
  if (!ctx.multipart) return { json: corpo };
  const form = await ctx.formData();
  return { produto_id: form.get('produto_id'), tamanho: form.get('arquivo').size };
};

describe('tratar com multipart', () => {
  it('entrega o FormData ao handler quando aceitarMultipart está ligado', async () => {
    const r = await tratar(reqForm(500), handlerForm, OPCOES);
    expect(r.status).toBe(200);
    expect((await r.json()).dados).toEqual({ produto_id: 'abc', tamanho: 500 });
  });

  it('multipart acima do limite -> 413 (por Content-Length ou por stream)', async () => {
    const grande = new Request(URL_TESTE, {
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data; boundary=x', 'content-length': '4000' },
      body: 'x',
    });
    expect((await tratar(grande, handlerForm, OPCOES)).status).toBe(413);
    const pedaco = new Uint8Array(1000);
    let enviados = 0;
    const stream = new ReadableStream({
      pull(c) {
        enviados += 1;
        if (enviados > 50) return c.close();
        c.enqueue(pedaco);
      },
    });
    const r = new Request(URL_TESTE, {
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data; boundary=x' },
      body: stream,
      duplex: 'half',
    });
    expect((await tratar(r, handlerForm, OPCOES)).status).toBe(413);
    expect(enviados).toBeLessThan(10);
  });

  it('multipart malformado -> 400', async () => {
    const r = new Request(URL_TESTE, {
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data; boundary=x' },
      body: 'lixo sem partes',
    });
    expect((await tratar(r, handlerForm, OPCOES)).status).toBe(400);
  });

  it('o corpo multipart só é lido se o handler pedir (autenticação vem antes)', async () => {
    let leu = false;
    const r = await tratar(
      reqForm(10),
      async (req) => {
        leu = req.bodyUsed;
        return 1;
      },
      OPCOES,
    );
    expect(r.status).toBe(200);
    expect(leu).toBe(false);
  });

  it('sem a opção, multipart continua rejeitado (400) e JSON segue valendo', async () => {
    expect((await tratar(reqForm(10), handlerForm)).status).toBe(400);
    const json = new Request(URL_TESTE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"a":1}',
    });
    const r = await tratar(json, handlerForm, OPCOES);
    expect((await r.json()).dados).toEqual({ json: { a: 1 } });
  });

  it('o limite padrão de 100 KB vale para JSON mesmo com multipart ligado', async () => {
    const grande = new Request(URL_TESTE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ x: 'a'.repeat(101 * 1024) }),
    });
    expect((await tratar(grande, handlerForm, OPCOES)).status).toBe(413);
  });
});
