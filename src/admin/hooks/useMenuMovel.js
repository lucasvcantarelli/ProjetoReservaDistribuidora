import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const FOCAVEL = 'a[href], button:not([disabled])';
const CONSULTA_DESKTOP = '(min-width: 900px)';

// Menu lateral que no celular vira gaveta: abre pelo botão, Esc fecha, o foco vai ao primeiro link
// ao abrir e, ao fechar, volta ao botão (Esc ou fundo) ou vai ao título da nova página (navegação).
// Também fecha sozinha quando a tela passa a ser larga (o menu fixo assume).
export function useMenuMovel() {
  // Guarda em qual página a gaveta foi aberta: ao navegar ela deixa de valer (fecha sozinha).
  const [abertaEm, setAbertaEm] = useState(null);
  const botaoRef = useRef(null);
  const menuRef = useRef(null);
  const { pathname } = useLocation();
  const pathnameAtual = useRef(pathname);

  // Layout effect: atualiza antes da limpeza dos efeitos abaixo, que compara com a página nova.
  useLayoutEffect(() => {
    pathnameAtual.current = pathname;
  });

  const aberto = abertaEm === pathname;
  const fechar = useCallback(() => setAbertaEm(null), []);
  const alternar = useCallback(
    () => setAbertaEm((atual) => (atual === pathname ? null : pathname)),
    [pathname],
  );

  useEffect(() => {
    if (!aberto) return undefined;
    const botao = botaoRef.current;
    const abertoEm = pathname;
    menuRef.current?.querySelector(FOCAVEL)?.focus();
    function aoTeclar(evento) {
      if (evento.key === 'Escape') setAbertaEm(null);
    }
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      const titulo = document.querySelector('main h1');
      const navegou = pathnameAtual.current !== abertoEm;
      (navegou && titulo ? titulo : botao)?.focus();
    };
  }, [aberto, pathname]);

  useEffect(() => {
    const consulta = window.matchMedia?.(CONSULTA_DESKTOP);
    if (!consulta) return undefined;
    function aoMudar(evento) {
      if (evento.matches) setAbertaEm(null);
    }
    consulta.addEventListener('change', aoMudar);
    return () => consulta.removeEventListener('change', aoMudar);
  }, []);

  return { aberto, alternar, fechar, botaoRef, menuRef };
}
