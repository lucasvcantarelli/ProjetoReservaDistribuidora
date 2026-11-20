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

// O jsdom não implementa rolagem; o React Router e a paginação a chamam.
if (typeof window !== 'undefined') window.scrollTo = () => {};
