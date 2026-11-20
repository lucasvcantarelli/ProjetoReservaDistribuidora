import { useContext } from 'react';
import { MarcaEmpresaContext } from '../contexts/MarcaEmpresaContext.jsx';

const SEM_PROVEDOR = { nome: '', logoUrl: null, definirLogo: () => {} };

// Fora do provedor (ex.: testes de um componente isolado) devolve "sem logo" em vez de quebrar.
export function useMarcaEmpresa() {
  return useContext(MarcaEmpresaContext) ?? SEM_PROVEDOR;
}
