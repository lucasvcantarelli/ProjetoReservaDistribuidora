import { useEffect, useRef } from 'react';

// Devolve a ref do <form>; quando os erros mudam, foca o primeiro campo marcado como inválido.
export function useFocoNoPrimeiroErro(erros) {
  const formRef = useRef(null);
  useEffect(() => {
    if (!erros || Object.keys(erros).length === 0) return;
    formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
  }, [erros]);
  return formRef;
}
