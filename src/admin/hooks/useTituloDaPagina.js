import { useTituloDaPagina as useTitulo } from '../../shared/hooks/useTituloDaPagina.js';

const SUFIXO = 'Painel administrativo';

export function useTituloDaPagina(titulo) {
  useTitulo(titulo, SUFIXO);
}
