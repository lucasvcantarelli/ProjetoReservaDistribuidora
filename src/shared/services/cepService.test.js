import { afterEach, describe, expect, it, vi } from 'vitest';
import { cepService } from './cepService.js';

function responder(corpo, { ok = true, status = 200 } = {}) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue({ ok, status, json: () => Promise.resolve(corpo) });
}

const SE = { logradouro: 'Praça da Sé', bairro: 'Sé', localidade: 'São Paulo', uf: 'SP' };

describe('cepService.buscar', () => {
  afterEach(() => vi.restoreAllMocks());

  it('converte a resposta do ViaCEP para os campos do formulário', async () => {
    const fetch = responder(SE);
    expect(await cepService.buscar('01001-000')).toEqual({
      rua: 'Praça da Sé',
      bairro: 'Sé',
      cidade: 'São Paulo',
      uf: 'SP',
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://viacep.com.br/ws/01001000/json/',
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('CEP incompleto não consulta nada', async () => {
    const fetch = responder(SE);
    expect(await cepService.buscar('0100-10')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ['CEP inexistente', () => responder({ erro: true })],
    ['erro do servidor', () => responder({}, { ok: false, status: 500 })],
    ['UF desconhecida', () => responder({ ...SE, uf: 'XX' })],
    ['sem cidade', () => responder({ ...SE, localidade: '' })],
    ['falha de rede', () => vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('rede'))],
  ])('%s -> null', async (_, preparar) => {
    preparar();
    expect(await cepService.buscar('01001000')).toBeNull();
  });

  it('corta campos maiores que o limite do formulário', async () => {
    responder({ ...SE, logradouro: 'R'.repeat(300), bairro: 'B'.repeat(300) });
    const endereco = await cepService.buscar('01001000');
    expect(endereco.rua).toHaveLength(160);
    expect(endereco.bairro).toHaveLength(80);
  });

  it('desiste depois de 5 segundos', async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_, { signal }) =>
        new Promise((_res, rejeitar) =>
          signal.addEventListener('abort', () => rejeitar(new DOMException('', 'AbortError'))),
        ),
    );
    const busca = cepService.buscar('01001000');
    await vi.advanceTimersByTimeAsync(5000);
    expect(await busca).toBeNull();
    vi.useRealTimers();
  });
});
