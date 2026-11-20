import { Link, NavLink } from 'react-router-dom';
import {
  IconeCategorias,
  IconeClientes,
  IconeConfiguracoes,
  IconeProdutos,
  IconeSair,
} from '../Icones';
import CreditoDesenvolvedor from '../../../shared/components/CreditoDesenvolvedor';
import MarcaPainel from '../MarcaPainel';
import estilos from './MenuLateral.module.css';

const ITENS = [
  { para: '/categorias', texto: 'Categorias', Icone: IconeCategorias },
  { para: '/produtos', texto: 'Produtos', Icone: IconeProdutos },
  { para: '/clientes', texto: 'Clientes', Icone: IconeClientes },
  { para: '/configuracoes', texto: 'Configurações', Icone: IconeConfiguracoes },
];

// Menu fixo no desktop; no celular é a gaveta controlada por `aberto` (ver useMenuMovel).
export default function MenuLateral({ id, aberto, menuRef, onSair }) {
  return (
    <aside id={id} ref={menuRef} className={`${estilos.menu} ${aberto ? estilos.aberto : ''}`}>
      <p className={estilos.marca}>
        <MarcaPainel />
      </p>
      <nav aria-label="Menu principal" className={estilos.navegacao}>
        {ITENS.map(({ para, texto, Icone }) => (
          <NavLink
            key={para}
            to={para}
            className={({ isActive }) => `${estilos.link} ${isActive ? estilos.ativo : ''}`}
          >
            <Icone />
            {texto}
          </NavLink>
        ))}
      </nav>
      <button type="button" className={`${estilos.link} ${estilos.sair}`} onClick={onSair}>
        <IconeSair />
        Sair
      </button>
      <Link to="/privacidade" className={estilos.privacidade}>
        Política de Privacidade
      </Link>
      <CreditoDesenvolvedor className={estilos.credito} />
    </aside>
  );
}
