import { useCallback, useEffect, useRef, useState } from 'react';

// Executa uma função assíncrona guardando carregando/erro/dados. Só a chamada mais recente atualiza o estado.
// `executar` devolve os dados, ou undefined se falhou (o erro fica em `erro`) ou foi superada por outra chamada.
export function useAsync(fn) {
  const [estado, setEstado] = useState({ carregando: false, erro: null, dados: null });
  const ultimaChamada = useRef(0);
  const montado = useRef(true);
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const executar = useCallback(async (...args) => {
    const id = ++ultimaChamada.current;
    const atual = () => montado.current && id === ultimaChamada.current;
    setEstado((e) => ({ ...e, carregando: true, erro: null }));
    try {
      const dados = await fnRef.current(...args);
      if (!atual()) return undefined;
      setEstado({ carregando: false, erro: null, dados });
      return dados;
    } catch (erro) {
      if (atual()) setEstado((e) => ({ ...e, carregando: false, erro }));
      return undefined;
    }
  }, []);

  return { executar, ...estado };
}
