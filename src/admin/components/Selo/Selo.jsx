import estilos from './Selo.module.css';

// Etiqueta de status; `tipo`: 'sucesso' | 'info' | 'neutro'.
export default function Selo({ tipo = 'neutro', children }) {
  return <span className={`${estilos.selo} ${estilos[tipo]}`}>{children}</span>;
}
