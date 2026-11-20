import { describe, expect, it } from 'vitest';
import { basenameDe } from './basename.js';

describe('basenameDe', () => {
  it('tira a barra final do BASE_URL', () => {
    expect(basenameDe('/painel-exemplo/')).toBe('/painel-exemplo');
    expect(basenameDe('/painel-exemplo')).toBe('/painel-exemplo');
  });

  it('base raiz vira sem basename', () => {
    expect(basenameDe('/')).toBeUndefined();
    expect(basenameDe(undefined)).toBeUndefined();
  });
});
