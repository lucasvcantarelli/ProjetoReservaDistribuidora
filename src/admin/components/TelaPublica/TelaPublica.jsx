import { Link } from 'react-router-dom';
import estilos from './TelaPublica.module.css';

// Moldura das telas do painel que abrem sem login (entrar, recuperação de senha): marca, conteúdo
// centralizado e o link da Política de Privacidade.
export default function TelaPublica({ children }) {
  return (
    <main className={estilos.tela}>
      <p className={estilos.marca}>Painel administrativo</p>
      {children}
      <p className={estilos.privacidade}>
        <Link to="/privacidade">Política de Privacidade</Link>
      </p>
    </main>
  );
}
