import { formatarReais } from '../../../shared/utils/formatar.js';
import { chaveDoItem } from '../../services/carrinhoService.js';
import estilos from './ListaDivergencias.module.css';

function nomeDoItem(divergencia, itensCarrinho) {
  const chave = chaveDoItem(divergencia.variacao_id, divergencia.forma);
  const item = itensCarrinho.find((i) => i.chave === chave);
  if (!item) return 'Item do carrinho';
  const nome = item.produto_nome;
  const tamanho = item.nome_tamanho;
  const jaNoNome = nome.toLowerCase().includes(tamanho.toLowerCase());
  return tamanho && !jaNoNome ? `${nome} (${tamanho})` : nome;
}

function explicar(divergencia) {
  if (divergencia.tipo === 'preco_mudou') {
    const antes = formatarReais(divergencia.preco_anterior_centavos);
    const agora = formatarReais(divergencia.preco_atual_centavos);
    return `Preço mudou de ${antes} para ${agora}`;
  }
  return 'Item indisponível — será removido';
}

// Explica cada mudança que o servidor encontrou no carrinho em relação ao que o cliente viu.
export default function ListaDivergencias({ divergencias, itensCarrinho }) {
  return (
    <section className={estilos.caixa} aria-labelledby="titulo-divergencias">
      <h2 id="titulo-divergencias" className={estilos.titulo}>
        Alguns itens mudaram
      </h2>
      <ul className={estilos.lista}>
        {divergencias.map((d) => (
          <li key={chaveDoItem(d.variacao_id, d.forma)} className={estilos.item}>
            <strong>{nomeDoItem(d, itensCarrinho)}</strong>
            <span>{explicar(d)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
