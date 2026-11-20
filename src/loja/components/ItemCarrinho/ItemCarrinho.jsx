import { Link } from 'react-router-dom';
import Botao from '../../../shared/components/Botao';
import { formatarInteiro, formatarReais } from '../../../shared/utils/formatar.js';
import { FORMA_FARDO, subtotalDoItem } from '../../utils/produto.js';
import SeletorQuantidade from '../SeletorQuantidade';
import estilos from './ItemCarrinho.module.css';

const LADO_FOTO_PX = 120;

function descricaoDaForma(item) {
  return item.forma === FORMA_FARDO
    ? `Fardo com ${formatarInteiro(item.qtd_por_fardo)} un.`
    : 'Unidade';
}

export default function ItemCarrinho({ item, onAlterarQuantidade, onRemover }) {
  return (
    <li className={estilos.item}>
      <Link to={`/produto/${item.produto_id}`} className={estilos.foto}>
        {item.foto_url ? (
          <img
            src={item.foto_url}
            alt={item.produto_nome}
            width={LADO_FOTO_PX}
            height={LADO_FOTO_PX}
            loading="lazy"
            className={estilos.imagem}
          />
        ) : (
          <span className={estilos.semFoto} aria-hidden="true">
            {item.produto_nome.charAt(0)}
          </span>
        )}
      </Link>

      <div className={estilos.dados}>
        <Link to={`/produto/${item.produto_id}`} className={estilos.nome}>
          {item.produto_nome}
        </Link>
        <p className={estilos.detalhe}>
          {item.nome_tamanho} · {descricaoDaForma(item)}
        </p>
        <p className={estilos.detalhe}>{formatarReais(item.preco_centavos)} cada</p>
      </div>

      <div className={estilos.controles}>
        <SeletorQuantidade
          valor={item.quantidade}
          rotulo={`Quantidade de ${item.produto_nome} ${item.nome_tamanho}`}
          onMudar={(quantidade) => onAlterarQuantidade(item.chave, quantidade)}
        />
        <p className={estilos.subtotal}>{formatarReais(subtotalDoItem(item))}</p>
        <Botao
          variante="texto"
          className={estilos.remover}
          aria-label={`Remover ${item.produto_nome} ${item.nome_tamanho}`}
          onClick={() => onRemover(item)}
        >
          Remover
        </Botao>
      </div>
    </li>
  );
}
