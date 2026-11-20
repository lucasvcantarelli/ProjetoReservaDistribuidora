import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const ATRASO_BUSCA_MS = 400;
const PRIMEIRA_PAGINA = 1;
const PARAM_BUSCA = 'busca';
const PARAM_CATEGORIA = 'categoria';
const PARAM_PAGINA = 'pagina';

function lerPagina(params) {
  const pagina = Number(params.get(PARAM_PAGINA));
  return Number.isInteger(pagina) && pagina >= PRIMEIRA_PAGINA ? pagina : PRIMEIRA_PAGINA;
}

// Filtros de uma lista do painel (produtos, clientes): a URL (?busca=&pagina=, e ?categoria= quando a lista usa) é a fonte da verdade.
// A digitação na busca só chega à URL depois de uma pausa (e volta à página 1).
export function useFiltrosDeLista() {
  const [params, setParams] = useSearchParams();
  const busca = (params.get(PARAM_BUSCA) ?? '').trim();
  const categoriaId = params.get(PARAM_CATEGORIA) ?? '';
  const pagina = lerPagina(params);
  const [texto, setTexto] = useState(busca);

  function alterar(mudancas, { substituir = true } = {}) {
    const proximos = new URLSearchParams(params);
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor) proximos.set(chave, String(valor));
      else proximos.delete(chave);
    }
    setParams(proximos, { replace: substituir });
  }

  useEffect(() => {
    const termo = texto.trim();
    if (termo === busca) return undefined;
    const temporizador = setTimeout(() => {
      const proximos = new URLSearchParams(params);
      if (termo) proximos.set(PARAM_BUSCA, termo);
      else proximos.delete(PARAM_BUSCA);
      proximos.delete(PARAM_PAGINA);
      setParams(proximos, { replace: true });
    }, ATRASO_BUSCA_MS);
    return () => clearTimeout(temporizador);
  }, [texto, busca, params, setParams]);

  return {
    busca,
    categoriaId,
    pagina,
    texto,
    setTexto,
    mudarCategoria: (id) => alterar({ [PARAM_CATEGORIA]: id, [PARAM_PAGINA]: null }),
    mudarPagina: (nova) =>
      alterar({ [PARAM_PAGINA]: nova > PRIMEIRA_PAGINA ? nova : null }, { substituir: false }),
  };
}
