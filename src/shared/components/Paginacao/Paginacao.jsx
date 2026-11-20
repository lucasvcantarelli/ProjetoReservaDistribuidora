import Botao from '../Botao';
import estilos from './Paginacao.module.css';

export default function Paginacao({ pagina, totalPaginas, onMudar }) {
  return (
    <nav className={estilos.paginacao} aria-label="Paginação">
      <Botao variante="secundario" disabled={pagina <= 1} onClick={() => onMudar(pagina - 1)}>
        Anterior
      </Botao>
      <span aria-live="polite">
        Página {pagina} de {totalPaginas}
      </span>
      <Botao
        variante="secundario"
        disabled={pagina >= totalPaginas}
        onClick={() => onMudar(pagina + 1)}
      >
        Próxima
      </Botao>
    </nav>
  );
}
