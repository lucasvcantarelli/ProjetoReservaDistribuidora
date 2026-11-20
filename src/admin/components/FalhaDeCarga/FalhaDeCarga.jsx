import Aviso from '../../../shared/components/Aviso';
import Botao from '../../../shared/components/Botao';
import estilos from './FalhaDeCarga.module.css';

// Erro ao carregar uma página do painel: mensagem do servidor e "Tentar novamente".
export default function FalhaDeCarga({ erro, onTentarDeNovo }) {
  return (
    <div className={estilos.falha}>
      <Aviso>{erro.message}</Aviso>
      <Botao variante="secundario" onClick={onTentarDeNovo}>
        Tentar novamente
      </Botao>
    </div>
  );
}
