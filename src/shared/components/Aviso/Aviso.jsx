import estilos from './Aviso.module.css';

// Mensagem geral de um formulário ou página (`tipo`: erro | sucesso | alerta); erros são anunciados na hora (role="alert").
export default function Aviso({ tipo = 'erro', children }) {
  if (!children) return null;
  return (
    <p role={tipo === 'erro' ? 'alert' : 'status'} className={`${estilos.aviso} ${estilos[tipo]}`}>
      {children}
    </p>
  );
}
