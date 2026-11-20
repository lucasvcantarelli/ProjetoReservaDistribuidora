import { useState } from 'react';
import estilos from './GaleriaProduto.module.css';

const LADO_FOTO_PRINCIPAL_PX = 800;
const LADO_MINIATURA_PX = 96;

export default function GaleriaProduto({ fotos, nome }) {
  const [indice, setIndice] = useState(0);

  if (fotos.length === 0) {
    return (
      <div className={estilos.principal}>
        <span className={estilos.semFoto} aria-hidden="true">
          {nome.charAt(0)}
        </span>
      </div>
    );
  }

  return (
    <div className={estilos.galeria}>
      <div className={estilos.principal}>
        <img
          src={fotos[indice]}
          alt={nome}
          width={LADO_FOTO_PRINCIPAL_PX}
          height={LADO_FOTO_PRINCIPAL_PX}
          className={estilos.imagem}
        />
      </div>
      {fotos.length > 1 && (
        <ul className={estilos.miniaturas} aria-label="Fotos do produto">
          {fotos.map((url, i) => (
            <li key={url}>
              <button
                type="button"
                className={estilos.miniatura}
                aria-label={`Ver foto ${i + 1} de ${fotos.length}`}
                aria-current={i === indice}
                onClick={() => setIndice(i)}
              >
                <img
                  src={url}
                  alt=""
                  width={LADO_MINIATURA_PX}
                  height={LADO_MINIATURA_PX}
                  loading="lazy"
                  className={estilos.imagem}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
