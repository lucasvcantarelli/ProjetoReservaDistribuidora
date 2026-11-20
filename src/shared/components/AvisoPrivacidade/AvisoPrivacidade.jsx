import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { avisoPrivacidadeService } from '../../services/avisoPrivacidadeService.js';
import estilos from './AvisoPrivacidade.module.css';

export const CAMINHO_PRIVACIDADE = '/privacidade';
const VARIAVEL_ALTURA = '--altura-aviso-privacidade';

// Reserva espaço no fim da página (e acima de barras fixas) enquanto o aviso está na tela.
function useReservaDeEspaco(ref, visivel) {
  useEffect(() => {
    if (!visivel) return undefined;
    const raiz = document.documentElement;
    const medir = () =>
      raiz.style.setProperty(VARIAVEL_ALTURA, `${ref.current?.offsetHeight ?? 0}px`);
    medir();
    window.addEventListener('resize', medir);
    return () => {
      window.removeEventListener('resize', medir);
      raiz.style.removeProperty(VARIAVEL_ALTURA);
    };
  }, [ref, visivel]);
}

// Aviso discreto na primeira visita: não bloqueia a tela e não rouba o foco. "Entendi" guarda a
// preferência; se o armazenamento falhar, apenas esconde o aviso enquanto a página estiver aberta.
const TEXTOS = {
  loja: 'Usamos apenas o armazenamento essencial do navegador para o carrinho e, se você quiser, para lembrar seus dados. Não usamos cookies de rastreamento.',
  admin:
    'Este painel usa apenas o armazenamento essencial do navegador para manter sua sessão de administrador. Não usamos cookies de rastreamento.',
};

// `contexto`: "loja" (padrão) ou "admin" escolhe o texto do aviso.
export default function AvisoPrivacidade({ contexto = 'loja' }) {
  const [visivel, setVisivel] = useState(() => !avisoPrivacidadeService.foiVisto());
  const ref = useRef(null);
  useReservaDeEspaco(ref, visivel);

  if (!visivel) return null;

  function entendi() {
    avisoPrivacidadeService.marcarVisto();
    setVisivel(false);
  }

  return (
    <div ref={ref} role="region" aria-label="Aviso de privacidade" className={estilos.aviso}>
      <p className={estilos.texto}>
        {TEXTOS[contexto] ?? TEXTOS.loja}{' '}
        <Link to={CAMINHO_PRIVACIDADE} className={estilos.link}>
          Política de Privacidade
        </Link>
      </p>
      <button type="button" className={estilos.botao} onClick={entendi}>
        Entendi
      </button>
    </div>
  );
}
