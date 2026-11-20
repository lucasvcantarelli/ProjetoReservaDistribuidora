import estilos from './CreditoDesenvolvedor.module.css';

export const SITE_DESENVOLVEDOR = 'https://www.cantarellitech.com.br';

// "Desenvolvido por CantarelliTech", com link em nova aba (rodapé da loja e menu do painel).
export default function CreditoDesenvolvedor({ className = '' }) {
  return (
    <p className={`${estilos.credito} ${className}`}>
      Desenvolvido por{' '}
      <a
        href={SITE_DESENVOLVEDOR}
        target="_blank"
        rel="noopener noreferrer"
        className={estilos.link}
      >
        CantarelliTech
      </a>
    </p>
  );
}
