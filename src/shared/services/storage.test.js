import { beforeEach, describe, expect, it, vi } from 'vitest';
import { storage } from './storage.js';

describe('storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('grava e lê valores JSON', () => {
    storage.gravar('k', { a: 1 });
    expect(storage.ler('k')).toEqual({ a: 1 });
  });

  it('JSON corrompido devolve o padrão', () => {
    window.localStorage.setItem('k', '{quebrado');
    expect(storage.ler('k', 'padrao')).toBe('padrao');
  });

  it('chave ausente devolve o padrão', () => {
    expect(storage.ler('nada', [])).toEqual([]);
  });

  it('remover apaga a chave', () => {
    storage.gravar('k', 1);
    storage.remover('k');
    expect(storage.ler('k', null)).toBeNull();
  });

  it('não lança quando o localStorage falha', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cota');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(storage.gravar('k', 1)).toBe(false);
    expect(storage.ler('k', 'p')).toBe('p');
  });
});
