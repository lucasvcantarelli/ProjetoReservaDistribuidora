import { formatarInteiro, formatarReais } from '../../../shared/utils/formatar.js';
import { FORMA_FARDO } from '../../utils/produto.js';
import estilos from './ResumoPedido.module.css';

function descricaoDaForma(item) {
  return item.forma === FORMA_FARDO
    ? `Fardo com ${formatarInteiro(item.qtd_por_fardo)} un.`
    : 'Unidade';
}

// Resumo do pedido com os dados confirmados pelo servidor (nomes, preços e totais).
export default function ResumoPedido({ itens, totalCentavos }) {
  return (
    <section className={estilos.resumo} aria-labelledby="titulo-resumo">
      <h2 id="titulo-resumo" className={estilos.titulo}>
        Resumo do pedido
      </h2>
      <ul className={estilos.lista}>
        {itens.map((item) => (
          <li key={`${item.variacao_id}:${item.forma}`} className={estilos.item}>
            <div className={estilos.dados}>
              <span className={estilos.nome}>{item.produto_nome}</span>
              <span className={estilos.detalhe}>
                {item.nome_tamanho} · {descricaoDaForma(item)}
              </span>
              <span className={estilos.detalhe}>
                {formatarInteiro(item.quantidade)} × {formatarReais(item.preco_centavos)}
              </span>
            </div>
            <strong className={estilos.subtotal}>{formatarReais(item.subtotal_centavos)}</strong>
          </li>
        ))}
      </ul>
      <p className={estilos.total}>
        <span>Total</span>
        <strong className={estilos.valor}>{formatarReais(totalCentavos)}</strong>
      </p>
    </section>
  );
}
