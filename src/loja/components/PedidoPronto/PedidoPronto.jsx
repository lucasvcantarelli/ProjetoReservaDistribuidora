import Botao from '../../../shared/components/Botao';
import estilos from './PedidoPronto.module.css';

// Pedido conferido: o cliente abre o WhatsApp tocando no botão (link normal, sem pop-up bloqueável).
export default function PedidoPronto({ link, onAbrir }) {
  return (
    <section className={estilos.caixa} aria-labelledby="titulo-pedido-pronto">
      <h2 id="titulo-pedido-pronto" className={estilos.titulo}>
        Pedido pronto!
      </h2>
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
    </section>
  );
}
