import { createPortal } from 'react-dom';
import { createContext, useCallback, useMemo, useState } from 'react';
import Toast from '../components/Toast';
import estilos from './ToastContext.module.css';

export const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [avisos, setAvisos] = useState([]);

  const fechar = useCallback((id) => {
    setAvisos((atuais) => atuais.filter((aviso) => aviso.id !== id));
  }, []);

  const mostrar = useCallback(({ tipo = 'sucesso', texto }) => {
    setAvisos((atuais) => [...atuais, { id: crypto.randomUUID(), tipo, texto }]);
  }, []);

  const valor = useMemo(() => ({ mostrar }), [mostrar]);

  return (
    <ToastContext.Provider value={valor}>
      {children}
      {createPortal(
        <div className={estilos.regiao} aria-live="polite" data-sempre-ativo>
          {avisos.map((aviso) => (
            <Toast
              key={aviso.id}
              id={aviso.id}
              tipo={aviso.tipo}
              texto={aviso.texto}
              onFechar={fechar}
            />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
