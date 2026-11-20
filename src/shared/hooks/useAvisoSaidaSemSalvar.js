import { useCallback, useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';
import { useConfirm } from './useConfirm.js';

const CONFIRMACAO = {
  titulo: 'Sair sem salvar?',
  texto: 'As alterações que você fez ainda não foram salvas e serão perdidas.',
  textoConfirmar: 'Sair sem salvar',
  variante: 'perigo',
};

// Com alterações não salvas (`sujo`): pergunta antes de trocar de página dentro do app e deixa o
// navegador avisar ao fechar/recarregar a aba. `liberarSaida()` desliga o aviso na hora (use logo
// antes de navegar depois de salvar, quando o estado ainda não chegou a atualizar).
export function useAvisoSaidaSemSalvar(sujo) {
  const { confirmar } = useConfirm();
  const sujoRef = useRef(sujo);

  useEffect(() => {
    sujoRef.current = sujo;
  }, [sujo]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      sujoRef.current && currentLocation.pathname !== nextLocation.pathname,
  );
  const { state, proceed, reset } = blocker;

  useEffect(() => {
    if (state !== 'blocked') return;
    confirmar(CONFIRMACAO).then((sair) => (sair ? proceed() : reset()));
  }, [state, proceed, reset, confirmar]);

  useEffect(() => {
    function avisarNavegador(evento) {
      if (!sujoRef.current) return;
      evento.preventDefault();
      evento.returnValue = '';
    }
    window.addEventListener('beforeunload', avisarNavegador);
    return () => window.removeEventListener('beforeunload', avisarNavegador);
  }, []);

  const liberarSaida = useCallback(() => {
    sujoRef.current = false;
  }, []);

  return { liberarSaida };
}
