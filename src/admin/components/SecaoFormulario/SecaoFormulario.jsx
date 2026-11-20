import estilos from './SecaoFormulario.module.css';

// Seção numerada de um formulário do painel: título com número, texto de apoio e campos.
export default function SecaoFormulario({ numero, titulo, texto, children }) {
  return (
    <section className={estilos.secao}>
      <h2 className={estilos.titulo}>
        <span className={estilos.numero}>{numero}</span>
        {titulo}
      </h2>
      {texto && <p className={estilos.texto}>{texto}</p>}
      {children}
    </section>
  );
}
