import CardProduto from '../CardProduto';
import estilos from './GradeProdutos.module.css';

const QTD_ESQUELETOS = 8;

export default function GradeProdutos({ itens, carregando = false }) {
  if (carregando) {
    return (
      <div className={estilos.grade} role="status" aria-label="Carregando produtos">
        {Array.from({ length: QTD_ESQUELETOS }, (_, i) => (
          <div key={i} className={estilos.esqueleto} aria-hidden="true" />
        ))}
      </div>
    );
  }
  return (
    <ul className={estilos.grade}>
      {itens.map((produto) => (
        <li key={produto.id} className={estilos.item}>
          <CardProduto produto={produto} />
        </li>
      ))}
    </ul>
  );
}
