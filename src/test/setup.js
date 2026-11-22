import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// `globals: false` desliga o cleanup automático do Testing Library.
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  if (typeof window !== 'undefined') {
    window.localStorage.clear();
    window.sessionStorage.clear();
  }
});

// Testes nunca acessam a internet: o ViaCEP (busca de CEP) falha como "fora do ar" salvo mock do teste.
const fetchOriginal = globalThis.fetch;
globalThis.fetch = (url, ...resto) =>
  String(url).startsWith('https://viacep.com.br/')
    ? Promise.reject(new TypeError('Rede desligada nos testes'))
    : fetchOriginal(url, ...resto);

// O jsdom não implementa rolagem; o React Router e a paginação a chamam.
if (typeof window !== 'undefined') window.scrollTo = () => {};
