import { describe, expect, it } from 'vitest';
import { basenameDe } from './basename.js';

describe('basenameDe', () => {
  it('tira a barra final do BASE_URL', () => {
    expect(basenameDe('/painel-x7k2q/')).toBe('/painel-x7k2q');
    expect(basenameDe('/painel-x7k2q')).toBe('/painel-x7k2q');
  });

  it('base raiz vira sem basename', () => {
    expect(basenameDe('/')).toBeUndefined();
    expect(basenameDe(undefined)).toBeUndefined();
  });
});
