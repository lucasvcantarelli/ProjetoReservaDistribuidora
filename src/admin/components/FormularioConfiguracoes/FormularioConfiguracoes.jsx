import Aviso from '../../../shared/components/Aviso';
import Campo from '../../../shared/components/Campo';
import { useFocoNoPrimeiroErro } from '../../../shared/hooks/useFocoNoPrimeiroErro.js';
import { useFormularioConfiguracoes } from '../../hooks/useFormularioConfiguracoes.js';
import { MAX_ENDERECO, MAX_NOME_EMPRESA, MAX_RODAPE } from '../../utils/configForm.js';
import BarraAcoes from '../BarraAcoes';
import LogoEmpresa from '../LogoEmpresa';
import PreviaWhatsapp from '../PreviaWhatsapp';
import SecaoFormulario from '../SecaoFormulario';
import estilos from './FormularioConfiguracoes.module.css';

const DICA_PRIVACIDADE = 'Aparece na Política de Privacidade para os clientes pedirem seus dados.';
const TEXTO_WHATSAPP =
  'É para este número que chega todo pedido feito na loja. Confira com atenção antes de salvar.';

// Configurações da empresa: WhatsApp dos pedidos (primeiro, para o número ficar sempre à vista),
// dados e rodapé da mensagem e logo.
// `config`: resposta de `obter`.
export default function FormularioConfiguracoes({ config }) {
  const f = useFormularioConfiguracoes(config);
  const formRef = useFocoNoPrimeiroErro(f.erros);
  const { valores, erros } = f;

  return (
    <form onSubmit={f.salvar} noValidate ref={formRef} className={estilos.formulario}>
      <Aviso>{f.aviso}</Aviso>

      <SecaoFormulario numero="1" titulo="WhatsApp dos pedidos" texto={TEXTO_WHATSAPP}>
        <Campo
          label="WhatsApp da empresa (com DDD)"
          name="whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          value={valores.whatsapp}
          erro={erros.whatsapp}
          onChange={f.mudarWhatsapp}
        />
        <PreviaWhatsapp valor={valores.whatsapp} salvo={f.whatsappSalvo} />
      </SecaoFormulario>

      <SecaoFormulario numero="2" titulo="Dados da empresa">
        <Campo
          label="Nome da empresa"
          name="nome"
          autoComplete="organization"
          maxLength={MAX_NOME_EMPRESA}
          value={valores.nome}
          erro={erros.nome}
          onChange={(e) => f.mudar('nome', e.target.value)}
        />
        <Campo
          label="CNPJ (opcional)"
          name="cnpj"
          inputMode="numeric"
          autoComplete="off"
          value={valores.cnpj}
          erro={erros.cnpj}
          onChange={(e) => f.mudarCnpj(e.target.value)}
        />
        <Campo
          label="Endereço (opcional)"
          name="endereco"
          autoComplete="off"
          maxLength={MAX_ENDERECO}
          value={valores.endereco}
          erro={erros.endereco}
          onChange={(e) => f.mudar('endereco', e.target.value)}
        />
        <Campo
          label="E-mail para assuntos de privacidade (LGPD)"
          name="email_privacidade"
          type="email"
          inputMode="email"
          autoComplete="off"
          dica={DICA_PRIVACIDADE}
          value={valores.email_privacidade}
          erro={erros.email_privacidade}
          onChange={(e) => f.mudar('email_privacidade', e.target.value)}
        />
        <Campo
          label="Texto de rodapé da mensagem (opcional)"
          name="rodape_mensagem"
          como="textarea"
          rows={3}
          maxLength={MAX_RODAPE}
          value={valores.rodape_mensagem}
          erro={erros.rodape_mensagem}
          dica={`${valores.rodape_mensagem.length} de ${MAX_RODAPE} caracteres`}
          onChange={(e) => f.mudar('rodape_mensagem', e.target.value)}
        />
      </SecaoFormulario>

      <SecaoFormulario numero="3" titulo="Logo">
        <LogoEmpresa urlInicial={config.logo_url} />
      </SecaoFormulario>

      <BarraAcoes enviando={f.enviando} />
    </form>
  );
}
