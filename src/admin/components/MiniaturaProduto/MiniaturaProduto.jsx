import { IconeProdutos } from '../Icones';
import estilos from './MiniaturaProduto.module.css';

// Foto de capa em miniatura na lista; sem foto mostra um ícone no lugar.
export default function MiniaturaProduto({ url }) {
  if (!url) {
    return (
      <span className={`${estilos.miniatura} ${estilos.vazia}`} role="img" aria-label="Sem foto">
        <IconeProdutos />
      </span>
    );
  }
  return <img className={estilos.miniatura} src={url} alt="" loading="lazy" />;
}
