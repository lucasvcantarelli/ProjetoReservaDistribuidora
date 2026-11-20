import Botao from '../../../shared/components/Botao';
import { IconeSetaBaixo, IconeSetaCima } from '../Icones';
import estilos from './ControlesOrdem.module.css';

// Setas de subir/descer de uma linha. Não usam `disabled`: um botão desabilitado perderia o foco do
// teclado no meio da operação, por isso só ficam com aria-disabled e ignoram o clique.
// `data-seta` ("<id>:cima|baixo") permite devolver o foco à seta certa depois de reordenar.
export default function ControlesOrdem({ id, nome, primeira, ultima, ocupado, onMover }) {
  function seta(direcao, delta, desativada, Icone) {
    return (
      <Botao
        variante="texto"
        className={estilos.seta}
        aria-disabled={desativada || undefined}
        aria-label={`Mover ${nome} para ${direcao === 'cima' ? 'cima' : 'baixo'}`}
        data-seta={`${id}:${direcao}`}
        onClick={() => !desativada && onMover(delta)}
      >
        <Icone />
      </Botao>
    );
  }

  return (
    <span className={estilos.ordem}>
      {seta('cima', -1, ocupado || primeira, IconeSetaCima)}
      {seta('baixo', 1, ocupado || ultima, IconeSetaBaixo)}
    </span>
  );
}
