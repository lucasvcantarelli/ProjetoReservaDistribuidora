import { useTituloDaPagina as useTitulo } from '../../shared/hooks/useTituloDaPagina.js';

const SUFIXO = 'Reserva Distribuidora';

export function useTituloDaPagina(titulo) {
  useTitulo(titulo, SUFIXO);
}
