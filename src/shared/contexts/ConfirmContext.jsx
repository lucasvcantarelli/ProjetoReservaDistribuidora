import { createContext, useCallback, useMemo, useRef, useState } from 'react';
import Botao from '../components/Botao';
import Modal from '../components/Modal';
import estilos from './ConfirmContext.module.css';

export const ConfirmContext = createContext(null);

const TEXTO_CONFIRMAR_PADRAO = 'Confirmar';

export function ConfirmProvider({ children }) {
  const [opcoes, setOpcoes] = useState(null);
  const resolverRef = useRef(null);

  const confirmar = useCallback(
    ({ titulo, texto, textoConfirmar = TEXTO_CONFIRMAR_PADRAO, variante = 'primario' }) =>
      new Promise((resolver) => {
        resolverRef.current = resolver;
        setOpcoes({ titulo, texto, textoConfirmar, variante });
      }),
    [],
  );

  const responder = useCallback((resposta) => {
    resolverRef.current?.(resposta);
    resolverRef.current = null;
    setOpcoes(null);
  }, []);

  const cancelar = useCallback(() => responder(false), [responder]);
  const valor = useMemo(() => ({ confirmar }), [confirmar]);

  return (
    <ConfirmContext.Provider value={valor}>
      {children}
      <Modal aberto={!!opcoes} titulo={opcoes?.titulo} onFechar={cancelar}>
        {opcoes?.texto && <p className={estilos.texto}>{opcoes.texto}</p>}
        <div className={estilos.acoes}>
          <Botao variante="secundario" onClick={cancelar}>
            Cancelar
          </Botao>
          <Botao variante={opcoes?.variante} onClick={() => responder(true)}>
            {opcoes?.textoConfirmar}
          </Botao>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}
