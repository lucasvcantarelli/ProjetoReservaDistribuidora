import { Link } from 'react-router-dom';
import { useBusca } from '../../hooks/useBusca.js';
import { useCarrinho } from '../../hooks/useCarrinho.js';
import { useEmpresa } from '../../hooks/useEmpresa.js';
import estilos from './Cabecalho.module.css';

function IconeBusca() {
  return (
    <svg className={estilos.iconeBusca} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="m20 20-3.5-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconeCarrinho() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path
        d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function Cabecalho() {
  const { nome, logo_url: logoUrl } = useEmpresa();
  const { quantidadeDeItens } = useCarrinho();
  const { texto, setTexto } = useBusca();

  return (
    <header className={estilos.cabecalho}>
      <div className={estilos.conteudo}>
        <Link to="/" className={estilos.marca} aria-label={`${nome}, página inicial`}>
          {logoUrl ? (
            <img src={logoUrl} alt="" className={estilos.logo} height="40" />
          ) : (
            <span className={estilos.marcaTexto}>{nome}</span>
          )}
        </Link>

        <form
          role="search"
          className={estilos.busca}
          onSubmit={(evento) => evento.preventDefault()}
        >
          <label htmlFor="busca-produtos" className="sr-only">
            Buscar produtos
          </label>
          <IconeBusca />
          <input
            id="busca-produtos"
            type="search"
            className={estilos.campoBusca}
            placeholder="Buscar copos, pratos, sacolas…"
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            autoComplete="off"
          />
        </form>

        <div className={estilos.acoes}>
          <Link
            to="/carrinho"
            className={estilos.carrinho}
            aria-label={`Carrinho, ${quantidadeDeItens} ${quantidadeDeItens === 1 ? 'item' : 'itens'}`}
          >
            <IconeCarrinho />
            {quantidadeDeItens > 0 && (
              <span className={estilos.selo} data-testid="selo-carrinho">
                {quantidadeDeItens}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
