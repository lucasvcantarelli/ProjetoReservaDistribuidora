import { useEffect } from 'react';
import estilos from './Toast.module.css';

export const DURACAO_TOAST_MS = 4000;

export default function Toast({ id, tipo = 'sucesso', texto, onFechar }) {
  useEffect(() => {
    const temporizador = setTimeout(() => onFechar(id), DURACAO_TOAST_MS);
    return () => clearTimeout(temporizador);
  }, [id, onFechar]);

  return (
    <div className={`${estilos.toast} ${estilos[tipo]}`}>
      <span>{texto}</span>
      <button
        type="button"
        className={estilos.fechar}
        onClick={() => onFechar(id)}
        aria-label="Fechar aviso"
      >
        ×
      </button>
    </div>
  );
}
