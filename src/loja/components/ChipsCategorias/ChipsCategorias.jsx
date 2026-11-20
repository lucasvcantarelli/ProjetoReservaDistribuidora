import { NavLink } from 'react-router-dom';
import estilos from './ChipsCategorias.module.css';

const classeChip = ({ isActive }) =>
  [estilos.chip, isActive && estilos.ativo].filter(Boolean).join(' ');

export default function ChipsCategorias({ categorias }) {
  return (
    <nav aria-label="Categorias" className={estilos.faixa}>
      <ul className={estilos.lista}>
        <li>
          <NavLink to="/" end className={classeChip}>
            Todos
          </NavLink>
        </li>
        {categorias.map((categoria) => (
          <li key={categoria.id}>
            <NavLink to={`/categoria/${categoria.slug}`} className={classeChip}>
              {categoria.nome}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
