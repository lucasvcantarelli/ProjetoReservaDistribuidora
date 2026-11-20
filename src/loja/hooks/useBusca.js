import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

const ATRASO_BUSCA_MS = 300;
const PARAM_BUSCA = 'busca';

// Campo de busca do cabeçalho: a URL (?busca=) é a fonte da verdade; a digitação é aplicada com atraso.
export function useBusca() {
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const busca = params.get(PARAM_BUSCA) ?? '';

  const [texto, setTexto] = useState(busca);
  // Ao mudar a URL (busca ou página), o campo volta a refletir a URL: texto pendente é descartado.
  const [urlAnterior, setUrlAnterior] = useState(`${pathname}?${busca}`);
  if (urlAnterior !== `${pathname}?${busca}`) {
    setUrlAnterior(`${pathname}?${busca}`);
    setTexto(busca);
  }

  useEffect(() => {
    const termo = texto.trim();
    if (termo === busca.trim()) return undefined;
    const temporizador = setTimeout(() => {
      const naListagem = pathname === '/' || pathname.startsWith('/categoria/');
      const search = termo ? `?${PARAM_BUSCA}=${encodeURIComponent(termo)}` : '';
      navigate({ pathname: naListagem ? pathname : '/', search }, { replace: naListagem });
    }, ATRASO_BUSCA_MS);
    return () => clearTimeout(temporizador);
  }, [texto, busca, pathname, navigate]);

  return { texto, setTexto };
}
