import { useEffect } from 'react';

export function useTituloDaPagina(titulo, sufixo) {
  useEffect(() => {
    document.title = `${titulo} | ${sufixo}`;
  }, [titulo, sufixo]);
}
