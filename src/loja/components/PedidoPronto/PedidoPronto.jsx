import Botao from '../../../shared/components/Botao';
import { ehAndroid, linksPorAplicativo } from '../../../shared/utils/whatsapp.js';
import estilos from './PedidoPronto.module.css';

// Pedido conferido: o cliente abre o WhatsApp tocando no botão (link normal, sem pop-up bloqueável).
// No Android, quem tem WhatsApp e WhatsApp Business escolhe por qual enviar.
export default function PedidoPronto({ link, onAbrir, android = ehAndroid() }) {
  const aplicativos = android ? linksPorAplicativo(link) : null;

  return (
    <section className={estilos.caixa} aria-labelledby="titulo-pedido-pronto">
      <h2 id="titulo-pedido-pronto" className={estilos.titulo}>
        Pedido pronto!
      </h2>
      {aplicativos ? (
        <>
          <p className={estilos.texto}>Escolha por qual WhatsApp enviar.</p>
          <div className={estilos.opcoes}>
            <Botao href={aplicativos.whatsapp} onClick={onAbrir} className={estilos.botao}>
              Enviar pelo WhatsApp
            </Botao>
            <Botao
              href={aplicativos.business}
              onClick={onAbrir}
              variante="secundario"
              className={estilos.botao}
            >
              Enviar pelo WhatsApp Business
            </Botao>
          </div>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onAbrir}
            className={estilos.linkComum}
          >
            Não abriu? Use o link do WhatsApp
          </a>
        </>
      ) : (
        <>
          <p className={estilos.texto}>
            Toque no botão abaixo para abrir o WhatsApp e enviar a mensagem para a empresa.
          </p>
          <Botao
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onAbrir}
            className={estilos.botao}
          >
            Abrir WhatsApp
          </Botao>
        </>
      )}
    </section>
  );
}
