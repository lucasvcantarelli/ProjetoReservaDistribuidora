import { useNavigate, useParams } from 'react-router-dom';
import Botao from '../../../shared/components/Botao';
import Carregando from '../../../shared/components/Carregando';
import DetalheProduto from '../../components/DetalheProduto';
import EstadoVazio from '../../components/EstadoVazio';
import { useProduto } from '../../hooks/useProduto.js';

const STATUS_NAO_ENCONTRADO = 404;

export default function Produto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { produto, carregando, erro, recarregar } = useProduto(id);

  if (erro?.status === STATUS_NAO_ENCONTRADO) {
    return (
      <EstadoVazio titulo="Produto não encontrado." texto="Ele pode ter saído do catálogo.">
        <Botao onClick={() => navigate('/')}>Ver produtos</Botao>
      </EstadoVazio>
    );
  }
  if (erro) {
    return (
      <EstadoVazio role="alert" titulo="Não foi possível carregar o produto." texto={erro.message}>
        <Botao onClick={recarregar}>Tentar novamente</Botao>
      </EstadoVazio>
    );
  }
  if (carregando) return <Carregando texto="Carregando produto…" />;
  return <DetalheProduto key={produto.id} produto={produto} />;
}
