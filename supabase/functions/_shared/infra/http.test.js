import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroHttp, responder, tratar } from './http.js';

const URL_TESTE = 'http://funcao.local/x';

function req(metodo, { origem, corpo, tipo = 'application/json' } = {}) {
  const headers = {};
  if (origem) headers.origin = origem;
  if (corpo !== undefined) headers['content-type'] = tipo;
  return new Request(URL_TESTE, { method: metodo, headers, body: corpo });
}

describe('tratar (HTTP das Edge Functions)', () => {
  beforeEach(() => {
    vi.stubGlobal('Deno', {
      env: { get: (k) => (k === 'ALLOWED_ORIGINS' ? 'http://a.test, http://b.test' : undefined) },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('só envia Allow-Origin para origem permitida', async () => {
    const ok = await tratar(req('OPTIONS', { origem: 'http://b.test' }), async () => ({}));
    expect(ok.status).toBe(204);
    expect(ok.headers.get('access-control-allow-origin')).toBe('http://b.test');
    const ruim = await tratar(req('OPTIONS', { origem: 'http://x.test' }), async () => ({}));
    expect(ruim.headers.get('access-control-allow-origin')).toBeNull();
    expect(ruim.headers.get('vary')).toBe('Origin');
  });

  it('rejeita métodos diferentes de POST/OPTIONS com 405', async () => {
    const r = await tratar(req('GET'), async () => ({}));
    expect(r.status).toBe(405);
  });

  it('envelopa sucesso e adiciona cabeçalhos de segurança', async () => {
    const r = await tratar(req('POST', { corpo: '{"a":1}' }), async (_r, c) => responder(c));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, dados: { a: 1 } });
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('cache-control')).toBe('no-store');
  });

  it('corpo inválido ou de outro tipo -> 400; corpo grande -> 413', async () => {
    const h = async () => ({});
    expect((await tratar(req('POST', { corpo: 'x' }), h)).status).toBe(400);
    expect((await tratar(req('POST', { corpo: '[]' }), h)).status).toBe(400);
    expect((await tratar(req('POST', { corpo: '{}', tipo: 'text/plain' }), h)).status).toBe(400);
    const grande = JSON.stringify({ x: 'a'.repeat(101 * 1024) });
    expect((await tratar(req('POST', { corpo: grande }), h)).status).toBe(413);
  });

  it('corpo em stream sem Content-Length acima do limite -> 413', async () => {
    const pedaco = new TextEncoder().encode('a'.repeat(40 * 1024));
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
      headers: { 'content-type': 'application/json' },
      body: stream,
      duplex: 'half',
    });
    expect(r.headers.get('content-length')).toBeNull();
    expect((await tratar(r, async () => ({}))).status).toBe(413);
    expect(enviados).toBeLessThan(10);
  });

  it('ErroHttp com dados inclui a carga extra no JSON de erro', async () => {
    const r = await tratar(req('POST', { corpo: '{}' }), async () => {
      throw new ErroHttp(409, 'Mudou', undefined, { divergencias: [1] });
    });
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ ok: false, erro: 'Mudou', dados: { divergencias: [1] } });
  });

  it('ErroHttp vira JSON de erro; erro desconhecido vira 500 genérico', async () => {
    const e = await tratar(req('POST', { corpo: '{}' }), async () => {
      throw new ErroHttp(422, 'Inválido', { cpf: 'x' });
    });
    expect(e.status).toBe(422);
    expect(await e.json()).toEqual({ ok: false, erro: 'Inválido', campos: { cpf: 'x' } });

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await tratar(req('POST', { corpo: '{}' }), async () => {
      throw new Error('segredo do banco');
    });
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ ok: false, erro: 'Erro inesperado. Tente novamente.' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
