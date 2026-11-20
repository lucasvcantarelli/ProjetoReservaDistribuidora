import { Link } from 'react-router-dom';
import { formatarReais } from '../../../shared/utils/formatar.js';
import estilos from './CardProduto.module.css';

const LADO_FOTO_PX = 400;

export default function CardProduto({ produto }) {
  const { id, nome, foto_url: fotoUrl, a_partir_de_centavos: preco } = produto;

  return (
    <Link to={`/produto/${id}`} className={estilos.card}>
      <span className={estilos.foto}>
        {fotoUrl ? (
          <img
            src={fotoUrl}
            alt={nome}
            width={LADO_FOTO_PX}
            height={LADO_FOTO_PX}
            loading="lazy"
            className={estilos.imagem}
          />
        ) : (
          <span className={estilos.semFoto} aria-hidden="true">
            {nome.charAt(0)}
          </span>
        )}
      </span>
      <span className={estilos.nome}>{nome}</span>
      {preco != null && (
        <span className={estilos.preco}>
          <span className={estilos.apartir}>a partir de</span> {formatarReais(preco)}
        </span>
      )}
    </Link>
  );
}
