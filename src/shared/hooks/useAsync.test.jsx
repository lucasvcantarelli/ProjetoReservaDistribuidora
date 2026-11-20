import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAsync } from './useAsync.js';

function adiavel() {
  let resolver;
  let rejeitar;
  const promessa = new Promise((res, rej) => {
    resolver = res;
    rejeitar = rej;
  });
  return { promessa, resolver, rejeitar };
}

describe('useAsync', () => {
  it('guarda dados e carregando', async () => {
    const { result } = renderHook(() => useAsync(async (x) => x * 2));
    await act(() => result.current.executar(2));
    expect(result.current).toMatchObject({ carregando: false, erro: null, dados: 4 });
  });

  it('guarda o erro e devolve undefined', async () => {
    const falha = new Error('x');
    const { result } = renderHook(() =>
      useAsync(async () => {
        throw falha;
      }),
    );
    let retorno = 'antes';
    await act(async () => {
      retorno = await result.current.executar();
    });
    expect(retorno).toBeUndefined();
    expect(result.current.erro).toBe(falha);
  });

  it('ignora chamada antiga que termina depois da mais recente', async () => {
    const lenta = adiavel();
    const rapida = adiavel();
    const fila = [lenta.promessa, rapida.promessa];
    const { result } = renderHook(() => useAsync(() => fila.shift()));
    let primeira;
    let segunda;
    act(() => {
      primeira = result.current.executar();
      segunda = result.current.executar();
    });
    await act(async () => {
      rapida.resolver('nova');
      await segunda;
      lenta.resolver('velha');
      await primeira;
    });
    expect(result.current.dados).toBe('nova');
    expect(result.current.carregando).toBe(false);
  });
});
