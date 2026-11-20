import Aviso from '../../../shared/components/Aviso';
import Botao from '../../../shared/components/Botao';
import { somenteDigitos } from '../../../shared/utils/formatar.js';
import {
  formatarWhatsappCompleto,
  linkDeTeste,
  whatsappCompleto,
} from '../../../shared/utils/whatsapp.js';
import estilos from './PreviaWhatsapp.module.css';

const MSG_SEM_WHATSAPP = 'Sem WhatsApp configurado, os clientes não conseguem enviar pedidos.';
const MSG_INCOMPLETO = 'Digite o número completo, com DDD, para ver onde os pedidos vão chegar.';
const MSG_NAO_SALVO = 'Ainda não salvo: clique em Salvar para os pedidos irem para este número.';

// Mostra, grande e sem ambiguidade, o número que vai receber os pedidos (o que está digitado agora),
// com um link para o dono conferir no próprio WhatsApp. `valor`: texto do campo; `salvo`: número
// gravado no servidor (com DDI) ou vazio.
function Conteudo({ valor, salvo }) {
  if (!somenteDigitos(valor)) return <Aviso tipo="alerta">{MSG_SEM_WHATSAPP}</Aviso>;
  const formatado = formatarWhatsappCompleto(valor);
  if (!formatado) return <p className={estilos.incompleto}>{MSG_INCOMPLETO}</p>;

  const naoSalvo = whatsappCompleto(valor) !== (salvo || null);
  return (
    <div className={estilos.previa}>
      <p className={estilos.numero}>{`Os pedidos chegarão em: ${formatado}`}</p>
      {naoSalvo && <p className={estilos.naoSalvo}>{MSG_NAO_SALVO}</p>}
      <Botao
        variante="secundario"
        href={linkDeTeste(valor)}
        target="_blank"
        rel="noopener noreferrer"
      >
        Testar número
      </Botao>
    </div>
  );
}

// O contêiner `aria-live` fica sempre montado: assim o leitor de tela anuncia também a primeira prévia.
export default function PreviaWhatsapp(props) {
  return (
    <div aria-live="polite">
      <Conteudo {...props} />
    </div>
  );
}
