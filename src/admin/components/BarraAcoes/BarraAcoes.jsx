import Botao from '../../../shared/components/Botao';
import estilos from './BarraAcoes.module.css';

// Barra fixa no fim dos formulários do painel: Cancelar (se `onCancelar` vier) e Salvar.
export default function BarraAcoes({ enviando, onCancelar }) {
  return (
    <div className={estilos.barra}>
      {onCancelar && (
        <Botao variante="secundario" onClick={onCancelar}>
          Cancelar
        </Botao>
      )}
      <Botao type="submit" carregando={enviando}>
        Salvar
      </Botao>
    </div>
  );
}
