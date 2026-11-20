import { useCallback, useState } from 'react';
import { ErroApi } from '../services/api.js';

// Estado comum dos formulários da loja: valores, erros por campo, aviso geral e envio em andamento.
export function useFormulario(inicial) {
  const [valores, setValores] = useState(inicial);
  const [erros, setErros] = useState({});
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);

  const mudar = useCallback((campo, valor) => {
    setValores((atuais) => ({ ...atuais, [campo]: valor }));
    setErros((atuais) => {
      if (!(campo in atuais)) return atuais;
      const restantes = { ...atuais };
      delete restantes[campo];
      return restantes;
    });
  }, []);

  const definirValores = useCallback((novos) => setValores(novos), []);

  // Executa o envio; erro da API vira erros por campo + aviso. Devolve o resultado ou undefined.
  const submeter = useCallback(async (acao) => {
    setEnviando(true);
    setAviso('');
    try {
      return await acao();
    } catch (erro) {
      if (!(erro instanceof ErroApi)) throw erro;
      setErros(erro.campos ?? {});
      setAviso(erro.message);
      return undefined;
    } finally {
      setEnviando(false);
    }
  }, []);

  return { valores, erros, aviso, enviando, mudar, definirValores, setErros, setAviso, submeter };
}
