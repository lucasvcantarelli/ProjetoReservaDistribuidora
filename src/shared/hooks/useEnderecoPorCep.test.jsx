import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cepService } from '../services/cepService.js';
import { useEnderecoPorCep } from './useEnderecoPorCep.js';

const SE = { rua: 'Praça da Sé', bairro: 'Sé', cidade: 'São Paulo', uf: 'SP' };

function adiavel() {
  let resolver;
  const promessa = new Promise((res) => {
    resolver = res;
  });
  return { promessa, resolver };
}

function montar() {
  const mudar = vi.fn();
  const { result } = renderHook(() => useEnderecoPorCep(mudar));
  return { mudar, result };
}

describe('useEnderecoPorCep', () => {
  afterEach(() => vi.restoreAllMocks());

  it('grava o CEP digitado e, com 8 dígitos, preenche o endereço', async () => {
    vi.spyOn(cepService, 'buscar').mockResolvedValue(SE);
    const { mudar, result } = montar();
    await act(() => result.current.aoMudarCep('01001-000'));
    expect(mudar).toHaveBeenCalledWith('cep', '01001-000');
    expect(mudar).toHaveBeenCalledWith('rua', 'Praça da Sé');
    expect(mudar).toHaveBeenCalledWith('bairro', 'Sé');
    expect(mudar).toHaveBeenCalledWith('cidade', 'São Paulo');
    expect(mudar).toHaveBeenCalledWith('uf', 'SP');
    expect(result.current.status).toBe('ocioso');
  });

  it('CEP incompleto só grava o texto', async () => {
    const buscar = vi.spyOn(cepService, 'buscar');
    const { mudar, result } = montar();
    await act(() => result.current.aoMudarCep('01001'));
    expect(mudar).toHaveBeenCalledTimes(1);
    expect(buscar).not.toHaveBeenCalled();
  });

  it('mostra "buscando" enquanto espera e "nao-encontrado" se não achar', async () => {
    const resposta = adiavel();
    vi.spyOn(cepService, 'buscar').mockReturnValue(resposta.promessa);
    const { mudar, result } = montar();
    act(() => {
      result.current.aoMudarCep('99999-999');
    });
    expect(result.current.status).toBe('buscando');
    await act(async () => resposta.resolver(null));
    expect(result.current.status).toBe('nao-encontrado');
    expect(mudar).toHaveBeenCalledTimes(1);
  });

  it('apagar dígitos depois de não encontrar volta ao normal', async () => {
    vi.spyOn(cepService, 'buscar').mockResolvedValue(null);
    const { result } = montar();
    await act(() => result.current.aoMudarCep('99999-999'));
    expect(result.current.status).toBe('nao-encontrado');
    await act(() => result.current.aoMudarCep('99999-99'));
    expect(result.current.status).toBe('ocioso');
  });

  it('ignora a resposta de um CEP que já foi trocado', async () => {
    const primeira = adiavel();
    vi.spyOn(cepService, 'buscar')
      .mockReturnValueOnce(primeira.promessa)
      .mockResolvedValueOnce({ rua: 'Rua Nova', bairro: 'Centro', cidade: 'Recife', uf: 'PE' });
    const { mudar, result } = montar();
    act(() => {
      result.current.aoMudarCep('01001-000');
    });
    await act(() => result.current.aoMudarCep('50010-000'));
    await act(async () => primeira.resolver(SE));
    expect(mudar).toHaveBeenCalledWith('cidade', 'Recife');
    expect(mudar).not.toHaveBeenCalledWith('cidade', 'São Paulo');
  });

  it('CEP de cidade inteira (sem rua e bairro) não apaga o que foi digitado', async () => {
    vi.spyOn(cepService, 'buscar').mockResolvedValue({
      rua: '',
      bairro: '',
      cidade: 'Gravatá',
      uf: 'PE',
    });
    const { mudar, result } = montar();
    await act(() => result.current.aoMudarCep('55640-000'));
    expect(mudar).toHaveBeenCalledWith('cidade', 'Gravatá');
    expect(mudar).not.toHaveBeenCalledWith('rua', expect.anything());
    expect(mudar).not.toHaveBeenCalledWith('bairro', expect.anything());
  });
});
