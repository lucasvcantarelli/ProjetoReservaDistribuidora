import estilos from './PaginaAdmin.module.css';

// Moldura de uma página do painel: título (com subtítulo opcional), linha de ações (botões) e conteúdo.
export default function PaginaAdmin({ titulo, subtitulo, acoes, children }) {
  return (
    <div className={estilos.pagina}>
      <div className={estilos.cabecalho}>
        <div>
          <h1 className={estilos.titulo} tabIndex={-1}>
            {titulo}
          </h1>
          {subtitulo && <p className={estilos.subtitulo}>{subtitulo}</p>}
        </div>
        {acoes && <div className={estilos.acoes}>{acoes}</div>}
      </div>
      {children}
    </div>
  );
}
