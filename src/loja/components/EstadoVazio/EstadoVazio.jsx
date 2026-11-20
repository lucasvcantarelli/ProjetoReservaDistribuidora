import estilos from './EstadoVazio.module.css';

// Mensagem central para listas vazias, erros e páginas inexistentes, com uma ação opcional.
export default function EstadoVazio({ titulo, texto, role, children }) {
  return (
    <section className={estilos.estado} role={role}>
      <h2 className={estilos.titulo}>{titulo}</h2>
      {texto && <p className={estilos.texto}>{texto}</p>}
      {children && <div className={estilos.acao}>{children}</div>}
    </section>
  );
}
