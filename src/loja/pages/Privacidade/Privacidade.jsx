import { useEffect } from 'react';
import PoliticaPrivacidade from '../../../shared/components/PoliticaPrivacidade';
import { useEmpresa } from '../../hooks/useEmpresa.js';

export default function Privacidade() {
  const empresa = useEmpresa();

  useEffect(() => {
    document.title = `Política de Privacidade — ${empresa.nome}`;
  }, [empresa.nome]);

  return <PoliticaPrivacidade empresa={empresa} />;
}
