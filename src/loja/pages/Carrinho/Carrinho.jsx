import { useNavigate } from 'react-router-dom';
import Botao from '../../../shared/components/Botao';
import { useConfirm } from '../../../shared/hooks/useConfirm.js';
import { formatarReais } from '../../../shared/utils/formatar.js';
import EstadoVazio from '../../components/EstadoVazio';
import ItemCarrinho from '../../components/ItemCarrinho';
import { useCarrinho } from '../../hooks/useCarrinho.js';
import estilos from './Carrinho.module.css';

export default function Carrinho() {
  const { itens, totalCentavos, alterarQuantidade, remover } = useCarrinho();
  const { confirmar } = useConfirm();
  const navigate = useNavigate();

  async function pedirRemocao(item) {
    const confirmado = await confirmar({
      titulo: 'Remover do carrinho?',
      texto: `${item.produto_nome} (${item.nome_tamanho}) sairá do seu carrinho.`,
      textoConfirmar: 'Remover',
      variante: 'perigo',
    });
    if (confirmado) remover(item.chave);
  }

  if (itens.length === 0) {
    return (
      <EstadoVazio
        titulo="Seu carrinho está vazio."
        texto="Escolha produtos para montar seu pedido."
      >
        <Botao onClick={() => navigate('/')}>Ver produtos</Botao>
      </EstadoVazio>
    );
  }

  return (
    <div className={estilos.carrinho}>
      <h1 className={estilos.titulo}>Carrinho</h1>
      <ul className={estilos.lista}>
        {itens.map((item) => (
          <ItemCarrinho
            key={item.chave}
            item={item}
            onAlterarQuantidade={alterarQuantidade}
            onRemover={pedirRemocao}
          />
        ))}
      </ul>

      <aside className={estilos.resumo}>
        <p className={estilos.total}>
          <span>Total</span>
          <strong className={estilos.valor}>{formatarReais(totalCentavos)}</strong>
        </p>
        <p className={estilos.aviso}>Os preços são confirmados ao finalizar o pedido.</p>
        <div className={estilos.acoes}>
          <Botao onClick={() => navigate('/finalizar')}>Finalizar pedido</Botao>
          <Botao variante="secundario" onClick={() => navigate('/')}>
            Continuar comprando
          </Botao>
        </div>
      </aside>
    </div>
  );
}
