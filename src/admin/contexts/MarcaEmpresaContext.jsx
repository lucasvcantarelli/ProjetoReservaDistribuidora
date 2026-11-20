import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { empresaPublicaService } from '../services/empresaPublicaService.js';

export const MarcaEmpresaContext = createContext(null);

// Nome e logo da empresa para o topo do painel (lidos da configuração pública).
// Se a leitura falhar, o painel continua funcionando e mostra só o texto.
export function MarcaEmpresaProvider({ children }) {
  const [marca, setMarca] = useState({ nome: '', logoUrl: null });

  useEffect(() => {
    let ativo = true;
    empresaPublicaService
      .obter()
      .then((config) => {
        if (ativo) setMarca({ nome: config?.nome ?? '', logoUrl: config?.logo_url ?? null });
      })
      .catch(() => {
        /* sem logo: o topo mostra só "Painel administrativo" */
      });
    return () => {
      ativo = false;
    };
  }, []);

  // Chamado depois de enviar uma logo nova em Configurações: o topo troca na hora.
  const definirLogo = useCallback((logoUrl) => setMarca((atual) => ({ ...atual, logoUrl })), []);

  const valor = useMemo(() => ({ ...marca, definirLogo }), [marca, definirLogo]);
  return <MarcaEmpresaContext.Provider value={valor}>{children}</MarcaEmpresaContext.Provider>;
}
