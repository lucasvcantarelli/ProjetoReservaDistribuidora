import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { adminAuthService } from '../services/adminAuthService.js';
import { sessaoAdmin } from '../services/apiAdmin.js';

const PAPEL_ADMIN = 'admin';

export const SessaoAdminContext = createContext(null);

export function SessaoAdminProvider({ children }) {
  const [atual, setAtual] = useState(() => sessaoAdmin.obter());

  useEffect(() => {
    return sessaoAdmin.assinar(setAtual);
  }, []);

  const iniciar = useCallback(({ sessao, usuario }) => sessaoAdmin.salvar(sessao, usuario), []);

  // Sai mesmo se o servidor não responder: o objetivo é encerrar a sessão neste aparelho.
  const sair = useCallback(async () => {
    try {
      await adminAuthService.sair();
    } catch {
      /* a sessão local é limpa de qualquer jeito */
    }
    sessaoAdmin.limpar();
  }, []);

  // Sessão expirada: só limpa o que está neste aparelho (o servidor já não a reconhece).
  const encerrarLocal = useCallback(() => sessaoAdmin.limpar(), []);

  // Só administradores valem no painel: qualquer outra sessão guardada é descartada.
  const usuario = atual?.usuario?.papel === PAPEL_ADMIN ? atual.usuario : null;
  useEffect(() => {
    if (atual && !usuario) sessaoAdmin.limpar();
  }, [atual, usuario]);

  const valor = useMemo(
    () => ({ usuario, iniciar, sair, encerrarLocal }),
    [usuario, iniciar, sair, encerrarLocal],
  );
  return <SessaoAdminContext.Provider value={valor}>{children}</SessaoAdminContext.Provider>;
}
