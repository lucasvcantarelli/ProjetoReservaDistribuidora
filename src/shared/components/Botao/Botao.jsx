import estilos from './Botao.module.css';

export default function Botao({
  variante = 'primario',
  carregando = false,
  type = 'button',
  disabled = false,
  className = '',
  children,
  ...resto
}) {
  const classes = [estilos.botao, estilos[variante], className].filter(Boolean).join(' ');
  // Com `href` vira um link com a mesma aparência (ex.: abrir o WhatsApp em outra aba).
  if (resto.href) {
    return (
      <a className={classes} {...resto}>
        {children}
      </a>
    );
  }
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      {...resto}
    >
      {carregando && <span className={estilos.spinner} aria-hidden="true" />}
      {children}
    </button>
  );
}
