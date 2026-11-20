import { Link } from 'react-router-dom';
import Botao from '../../../shared/components/Botao';
import { formatarReais } from '../../../shared/utils/formatar.js';
import { useCompra } from '../../hooks/useCompra.js';
import { FORMA_FARDO, rotuloDaForma } from '../../utils/produto.js';
import GaleriaProduto from '../GaleriaProduto';
import SeletorQuantidade from '../SeletorQuantidade';
import SeletorVariacao from '../../../shared/components/SeletorVariacao';
import estilos from './DetalheProduto.module.css';

export default function DetalheProduto({ produto }) {
  const compra = useCompra(produto);
  const { variacao, forma } = compra;

  return (
    <article className={estilos.detalhe}>
      <GaleriaProduto fotos={produto.fotos} nome={produto.nome} />

      <div className={estilos.info}>
        <Link to={`/categoria/${produto.categoria.slug}`} className={estilos.categoria}>
          {produto.categoria.nome}
        </Link>
        <h1 className={estilos.nome}>{produto.nome}</h1>
        {produto.descricao && <p className={estilos.descricao}>{produto.descricao}</p>}

        {variacao ? (
          <>
            <SeletorVariacao
              legenda="Tamanho"
              nome="tamanho"
              opcoes={compra.variacoes.map((v) => ({ valor: v.id, rotulo: v.nome_tamanho }))}
              valor={variacao.id}
              onMudar={compra.escolherVariacao}
            />
            <SeletorVariacao
              legenda="Forma de venda"
              nome="forma"
              opcoes={compra.formas.map((f) => ({ valor: f, rotulo: rotuloDaForma(f, variacao) }))}
              valor={forma}
              onMudar={compra.escolherForma}
            />

            <p className={estilos.preco} aria-live="polite">
              <span className={estilos.valor}>{formatarReais(compra.preco)}</span>
              <span className={estilos.unidadeDoPreco}>
                {forma === FORMA_FARDO ? 'por fardo' : 'por unidade'}
              </span>
            </p>

            <div className={estilos.compra}>
              <SeletorQuantidade valor={compra.quantidade} onMudar={compra.mudarQuantidade} />
              <Botao className={estilos.adicionar} onClick={compra.adicionarAoCarrinho}>
                Adicionar ao carrinho
              </Botao>
            </div>
          </>
        ) : (
          <p className={estilos.indisponivel}>Este produto está indisponível no momento.</p>
        )}
      </div>
    </article>
  );
}
