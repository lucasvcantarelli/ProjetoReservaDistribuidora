import estilos from './Carregando.module.css';

export default function Carregando({ texto = 'Carregando…' }) {
  return (
    <div role="status" className={estilos.carregando}>
      <span className={estilos.spinner} aria-hidden="true" />
      <span className="sr-only">{texto}</span>
    </div>
  );
}
