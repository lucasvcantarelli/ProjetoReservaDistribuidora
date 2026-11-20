import { useNavigate } from 'react-router-dom';
import Botao from '../../../shared/components/Botao';
import EstadoVazio from '../../components/EstadoVazio';

export default function NaoEncontrado() {
  const navigate = useNavigate();
  return (
    <EstadoVazio
      titulo="Página não encontrada."
      texto="O endereço pode estar errado ou ter mudado."
    >
      <Botao onClick={() => navigate('/')}>Ir para o início</Botao>
    </EstadoVazio>
  );
}
