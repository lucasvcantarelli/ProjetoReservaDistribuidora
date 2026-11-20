import { Link } from 'react-router-dom';
import { useEmpresa } from '../../hooks/useEmpresa.js';
import { formatarWhatsappCompleto, linkDeTeste } from '../../../shared/utils/whatsapp.js';
import estilos from './Rodape.module.css';

export default function Rodape() {
  const { nome, endereco, whatsapp } = useEmpresa();
  const ano = new Date().getFullYear();

  return (
    <footer className={estilos.rodape}>
      <div className={estilos.conteudo}>
        <p className={estilos.nome}>{nome}</p>
        {endereco && <p className={estilos.linha}>{endereco}</p>}
        {formatarWhatsappCompleto(whatsapp) && (
          <p className={estilos.linha}>
            WhatsApp:{' '}
            <a
              href={linkDeTeste(whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className={estilos.link}
            >
              {formatarWhatsappCompleto(whatsapp)}
            </a>
          </p>
        )}
        <p className={estilos.linha}>
          <Link to="/privacidade" className={estilos.link}>
            Política de Privacidade
          </Link>
        </p>
        <p className={estilos.direitos}>
          © {ano} {nome}
        </p>
      </div>
    </footer>
  );
}
