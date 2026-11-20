import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import PoliticaPrivacidade from '../../../shared/components/PoliticaPrivacidade';
import { useAsync } from '../../../shared/hooks/useAsync.js';
import { useTituloDaPagina } from '../../hooks/useTituloDaPagina.js';
import { empresaPublicaService } from '../../services/empresaPublicaService.js';
import estilos from './Privacidade.module.css';

// Pública (fora do RotaAdmin): a pessoa pode ler a política antes de entrar. Se a configuração não
// carregar, o texto aparece com os dados padrão.
export default function Privacidade() {
  useTituloDaPagina('Política de Privacidade');
  const { executar, dados } = useAsync(() => empresaPublicaService.obter());

  useEffect(() => {
    executar();
  }, [executar]);

  return (
    <main className={estilos.pagina}>
      <PoliticaPrivacidade empresa={dados ?? {}} />
      <p className={estilos.voltar}>
        <Link to="/">Voltar ao painel</Link>
      </p>
    </main>
  );
}
