import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroApi, criarApi } from './api.js';
import { criarSessao } from './sessao.js';

const BASE = 'https://fn.test';
const USUARIO = { id: 'u1', email: 'a@b.com', nome: 'Ana', papel: 'admin' };
const SESSAO = { access_token: 'velho', refresh_token: 'r1', expires_at: 1 };
const SESSAO_NOVA = { access_token: 'novo', refresh_token: 'r2', expires_at: 2 };

function resposta(status, corpo) {
  return new Response(JSON.stringify(corpo), { status });
}
const ok = (dados) => resposta(200, { ok: true, dados });
const naoAutorizado = () => resposta(401, { ok: false, erro: 'Sessão expirada.' });

function chamadasPara(fetchMock, funcao) {
  return fetchMock.mock.calls.filter(([url]) => url === `${BASE}/${funcao}`);
}

describe('criarApi', () => {
  let sessao;
  let api;
  let fetchMock;

  beforeEach(() => {
    window.localStorage.clear();
    sessao = criarSessao('reserva.teste');
    api = criarApi(sessao, { baseUrl: BASE });
    fetchMock = vi.spyOn(globalThis, 'fetch');
  });
  afterEach(() => vi.restoreAllMocks());

  it('POST JSON e devolve dados; sem Authorization quando não autenticado', async () => {
    fetchMock.mockResolvedValue(ok({ x: 1 }));
    await expect(api.chamar('catalogo', { a: 1 })).resolves.toEqual({ x: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/catalogo`);
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"a":1}');
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('envia Bearer quando autenticado', async () => {
    sessao.salvar(SESSAO, USUARIO);
    fetchMock.mockResolvedValue(ok({}));
    await api.chamar('admin-produtos', {}, { autenticado: true });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer velho');
  });

  it('envia FormData sem Content-Type JSON', async () => {
    fetchMock.mockResolvedValue(ok({}));
    const formData = new FormData();
    await api.chamar('admin-fotos', null, { formData });
    const init = fetchMock.mock.calls[0][1];
    expect(init.body).toBe(formData);
    expect(init.headers['Content-Type']).toBeUndefined();
  });

  it('erro 400 com campos vira ErroApi com status, campos e dados', async () => {
    fetchMock.mockResolvedValue(
      resposta(400, { ok: false, erro: 'Inválido', campos: { email: 'Ruim' }, dados: { z: 1 } }),
    );
    const erro = await api.chamar('admin-produtos', {}).catch((e) => e);
    expect(erro).toBeInstanceOf(ErroApi);
    expect(erro).toMatchObject({
      status: 400,
      message: 'Inválido',
      campos: { email: 'Ruim' },
      dados: { z: 1 },
    });
  });

  it('falha de rede vira ErroApi status 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const erro = await api.chamar('catalogo', {}).catch((e) => e);
    expect(erro).toMatchObject({
      status: 0,
      message: 'Não foi possível conectar. Verifique sua internet.',
    });
  });

  it('resposta que não é JSON vira ErroApi genérico', async () => {
    fetchMock.mockResolvedValue(new Response('<html>', { status: 502 }));
    const erro = await api.chamar('catalogo', {}).catch((e) => e);
    expect(erro).toBeInstanceOf(ErroApi);
    expect(erro.status).toBe(502);
  });

  it('401 com refresh ok: renova, salva a sessão nova e repete', async () => {
    sessao.salvar(SESSAO, USUARIO);
    fetchMock
      .mockResolvedValueOnce(naoAutorizado())
      .mockResolvedValueOnce(ok({ sessao: SESSAO_NOVA }))
      .mockResolvedValueOnce(ok({ pedido: 1 }));
    await expect(api.chamar('pedido-revisar', {}, { autenticado: true })).resolves.toEqual({
      pedido: 1,
    });
    expect(sessao.obter().sessao).toEqual(SESSAO_NOVA);
    expect(JSON.parse(chamadasPara(fetchMock, 'auth-refresh')[0][1].body)).toEqual({
      refresh_token: 'r1',
    });
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer novo');
  });

  it('refresh falha: limpa a sessão e lança ErroApi 401', async () => {
    sessao.salvar(SESSAO, USUARIO);
    fetchMock
      .mockResolvedValueOnce(naoAutorizado())
      .mockResolvedValueOnce(resposta(401, { ok: false, erro: 'Sessão expirada.' }));
    const erro = await api.chamar('pedido-revisar', {}, { autenticado: true }).catch((e) => e);
    expect(erro).toBeInstanceOf(ErroApi);
    expect(erro.status).toBe(401);
    expect(sessao.obter()).toBeNull();
  });

  it('refresh com falha de rede ou 5xx mantém a sessão e propaga o erro original', async () => {
    sessao.salvar(SESSAO, USUARIO);
    fetchMock
      .mockResolvedValueOnce(naoAutorizado())
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const rede = await api.chamar('x', {}, { autenticado: true }).catch((e) => e);
    expect(rede.status).toBe(0);
    expect(sessao.obter()).not.toBeNull();

    fetchMock
      .mockResolvedValueOnce(naoAutorizado())
      .mockResolvedValueOnce(resposta(503, { ok: false, erro: 'Indisponível' }));
    const servidor = await api.chamar('x', {}, { autenticado: true }).catch((e) => e);
    expect(servidor.status).toBe(503);
    expect(sessao.obter()).not.toBeNull();
  });

  it('repete só uma vez: segundo 401 após renovar é propagado', async () => {
    sessao.salvar(SESSAO, USUARIO);
    fetchMock
      .mockResolvedValueOnce(naoAutorizado())
      .mockResolvedValueOnce(ok({ sessao: SESSAO_NOVA }))
      .mockResolvedValueOnce(naoAutorizado());
    const erro = await api.chamar('x', {}, { autenticado: true }).catch((e) => e);
    expect(erro.status).toBe(401);
    expect(chamadasPara(fetchMock, 'auth-refresh')).toHaveLength(1);
  });

  it('dois 401 em paralelo disparam um único auth-refresh', async () => {
    sessao.salvar(SESSAO, USUARIO);
    fetchMock.mockImplementation(async (url, init) => {
      if (url === `${BASE}/auth-refresh`) return ok({ sessao: SESSAO_NOVA });
      return init.headers.Authorization === 'Bearer novo' ? ok({ v: url }) : naoAutorizado();
    });
    const [a, b] = await Promise.all([
      api.chamar('f1', {}, { autenticado: true }),
      api.chamar('f2', {}, { autenticado: true }),
    ]);
    expect(a).toEqual({ v: `${BASE}/f1` });
    expect(b).toEqual({ v: `${BASE}/f2` });
    expect(chamadasPara(fetchMock, 'auth-refresh')).toHaveLength(1);
  });

  it('401 sem refresh_token (não logado) é propagado sem renovar', async () => {
    fetchMock.mockResolvedValue(naoAutorizado());
    const erro = await api.chamar('x', {}, { autenticado: true }).catch((e) => e);
    expect(erro.status).toBe(401);
    expect(chamadasPara(fetchMock, 'auth-refresh')).toHaveLength(0);
  });
});

describe('criarApi sem sessão (loja pública)', () => {
  it('chama sem Authorization e nunca tenta renovar, mesmo pedindo autenticado', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(naoAutorizado());
    const api = criarApi(undefined, { baseUrl: BASE });
    const erro = await api.chamar('x', {}, { autenticado: true }).catch((e) => e);
    expect(erro.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
    vi.restoreAllMocks();
  });
});
