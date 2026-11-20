import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useModalAcessivel } from '../../hooks/useModalAcessivel.js';
import estilos from './Modal.module.css';

function ModalAberto({ titulo, onFechar, children }) {
  const idTitulo = useId();
  const contornoRef = useRef(null);
  const dialogoRef = useRef(null);
  useModalAcessivel({ contornoRef, dialogoRef, onFechar });

  return (
    <div ref={contornoRef} className={estilos.fundo}>
      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className={estilos.dialogo}
      >
        <h2 id={idTitulo} className={estilos.titulo}>
          {titulo}
        </h2>
        {children}
      </div>
    </div>
  );
}

export default function Modal({ aberto, titulo, onFechar, children }) {
  if (!aberto) return null;
  return createPortal(
    <ModalAberto titulo={titulo} onFechar={onFechar}>
      {children}
    </ModalAberto>,
    document.body,
  );
}
