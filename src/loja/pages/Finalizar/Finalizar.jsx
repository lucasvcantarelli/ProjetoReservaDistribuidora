import { Link } from 'react-router-dom';
import Botao from '../../../shared/components/Botao';
import Campo from '../../../shared/components/Campo';
import Carregando from '../../../shared/components/Carregando';
import Modal from '../../../shared/components/Modal';
import Aviso from '../../../shared/components/Aviso';
import { useFocoNoPrimeiroErro } from '../../../shared/hooks/useFocoNoPrimeiroErro.js';
import FormularioIdentificacao from '../../components/FormularioIdentificacao';
import ListaDivergencias from '../../components/ListaDivergencias';
import PedidoPronto from '../../components/PedidoPronto';
import ResumoPedido from '../../components/ResumoPedido';
import { MAX_OBSERVACAO, useFinalizarPedido } from '../../hooks/useFinalizarPedido.js';
import { useTituloDaPagina } from '../../hooks/useTituloDaPagina.js';
import estilos from './Finalizar.module.css';

export default function Finalizar() {
  useTituloDaPagina('Finalizar pedido');
  const f = useFinalizarPedido();
  const formRef = useFocoNoPrimeiroErro(f.identificacao.erros);

  function aoSubmeter(evento) {
    evento.preventDefault();
    if (!f.linkDoWhatsapp && !f.temDivergencia) f.prepararEnvio();
  }

  if (f.carregando && !f.revisao) return <Carregando texto="Conferindo preços…" />;
  if (!f.revisao) {
    return (
      <div className={estilos.pagina}>
        <h1 className={estilos.titulo}>Finalizar pedido</h1>
        <Aviso>{f.aviso}</Aviso>
        <Botao onClick={f.tentarNovamente}>Tentar novamente</Botao>
      </div>
    );
  }

  return (
    <div className={estilos.pagina}>
      <h1 className={estilos.titulo}>Finalizar pedido</h1>
      {f.temDivergencia && (
        <>
          <ListaDivergencias
            divergencias={f.revisao.divergencias}
            itensCarrinho={f.itensDoCarrinho}
          />
          <Botao onClick={f.atualizarCarrinho} carregando={f.carregando}>
            Atualizar carrinho e continuar
          </Botao>
        </>
      )}
      <ResumoPedido itens={f.revisao.itens} totalCentavos={f.revisao.total_centavos} />
      <form className={estilos.formulario} onSubmit={aoSubmeter} noValidate ref={formRef}>
        <FormularioIdentificacao
          valores={f.identificacao.valores}
          erros={f.identificacao.erros}
          onMudar={f.identificacao.mudar}
          onMudarTipo={f.identificacao.mudarTipo}
        />
        <Campo
          label="Observação (opcional)"
          como="textarea"
          rows={3}
          maxLength={MAX_OBSERVACAO}
          value={f.observacao}
          onChange={(e) => f.setObservacao(e.target.value)}
          dica={`${f.observacao.length}/${MAX_OBSERVACAO} caracteres`}
        />
        <div className={estilos.lembrar}>
          <label className={estilos.opcaoLembrar}>
            <input
              type="checkbox"
              checked={f.lembrar}
              onChange={(e) => f.setLembrar(e.target.checked)}
            />
            Lembrar meus dados neste aparelho
          </label>
          <Link to="/privacidade" target="_blank" className={estilos.privacidade}>
            Saiba como guardamos seus dados
          </Link>
          {f.temDadosSalvos && (
            <button type="button" className={estilos.esquecer} onClick={f.esquecerDados}>
              Esquecer meus dados
            </button>
          )}
        </div>
        <Aviso>{f.aviso}</Aviso>
        {f.linkDoWhatsapp ? (
          <PedidoPronto link={f.linkDoWhatsapp} onAbrir={f.aoAbrirWhatsapp} />
        ) : (
          <Botao type="submit" carregando={f.enviando} disabled={f.temDivergencia}>
            Preparar pedido
          </Botao>
        )}
      </form>
      <p className={estilos.aviso}>
        Seu pedido e seus dados não são salvos no site: seguem como mensagem para o WhatsApp da
        empresa.
      </p>

      <Modal
        aberto={f.perguntandoEnvio}
        titulo="Seu pedido foi enviado pelo WhatsApp?"
        onFechar={f.manterCarrinho}
      >
        <div className={estilos.acoesModal}>
          <Botao variante="secundario" onClick={f.manterCarrinho}>
            Não, manter carrinho
          </Botao>
          <Botao onClick={f.confirmarEnvio}>Sim, limpar carrinho</Botao>
        </div>
      </Modal>
    </div>
  );
}
