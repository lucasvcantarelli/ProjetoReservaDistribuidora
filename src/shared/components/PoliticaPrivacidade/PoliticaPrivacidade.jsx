import { formatarCnpj, somenteDigitos } from '../../utils/formatar.js';
import { formatarWhatsappCompleto } from '../../utils/whatsapp.js';
import { ITENS_ARMAZENAMENTO, SECOES, ULTIMA_ATUALIZACAO } from './constantes.js';
import estilos from './PoliticaPrivacidade.module.css';

const NOME_PADRAO = 'Reserva Distribuidora';
const TAMANHO_CNPJ = 14;

function cnpjParaExibir(cnpj) {
  const digitos = somenteDigitos(cnpj);
  return digitos.length === TAMANHO_CNPJ ? formatarCnpj(digitos) : '';
}

// "pelo e-mail ...", senão "pelo WhatsApp da empresa: ...", senão um canal genérico.
function Contato({ email, whatsapp }) {
  if (email) {
    return (
      <>
        pelo e-mail <a href={`mailto:${email}`}>{email}</a>
      </>
    );
  }
  const numero = formatarWhatsappCompleto(whatsapp);
  if (numero) return <>pelo WhatsApp da empresa: {numero}</>;
  return <>pelos canais de atendimento da empresa</>;
}

function UltimaAtualizacao() {
  return (
    <p className={estilos.atualizacao}>
      Última atualização: <time dateTime={ULTIMA_ATUALIZACAO.iso}>{ULTIMA_ATUALIZACAO.texto}</time>
    </p>
  );
}

// Texto da Política de Privacidade e Cookies (LGPD). `empresa`: { nome, cnpj, endereco, whatsapp, email_privacidade }.
export default function PoliticaPrivacidade({ empresa = {} }) {
  const nome = empresa.nome || NOME_PADRAO;
  const cnpj = cnpjParaExibir(empresa.cnpj);
  const contato = <Contato email={empresa.email_privacidade} whatsapp={empresa.whatsapp} />;

  return (
    <article className={estilos.politica}>
      <h1 className={estilos.titulo}>Política de Privacidade e Cookies</h1>
      <UltimaAtualizacao />
      <p>
        Esta política explica, em linguagem simples, como a {nome} trata dados pessoais, de acordo
        com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018, a LGPD).
      </p>

      <nav aria-label="Sumário" className={estilos.sumario}>
        <ol>
          {SECOES.map(({ id, titulo }) => (
            <li key={id}>
              <a href={`#${id}`}>{titulo}</a>
            </li>
          ))}
        </ol>
      </nav>

      <section aria-labelledby="quem-somos">
        <h2 id="quem-somos">1. Quem somos</h2>
        <p>
          A responsável pelos dados tratados neste site (a controladora, na linguagem da LGPD) é a{' '}
          <strong>{nome}</strong>, distribuidora de produtos descartáveis.
        </p>
        <ul>
          {cnpj && <li>CNPJ: {cnpj}</li>}
          {empresa.endereco && <li>Endereço: {empresa.endereco}</li>}
          <li>Contato para assuntos de privacidade: {contato}.</li>
        </ul>
      </section>

      <section aria-labelledby="dados">
        <h2 id="dados">2. Quais dados tratamos</h2>
        <h3>Ao montar um pedido na loja</h3>
        <p>
          Você não cria conta nem senha. Na hora de finalizar o pedido, você digita seu nome,
          telefone e endereço. Se comprar como empresa, informa também a razão social e o CNPJ.
          Pessoas físicas <strong>não</strong> informam CPF.
        </p>
        <p>
          Esses dados servem apenas para montar a mensagem de pedido que <strong>você mesmo</strong>{' '}
          envia pelo WhatsApp. Eles <strong>não são armazenados</strong> em nossos servidores: o
          site só confere os preços e monta o link da conversa.
        </p>
        <h3>Cadastro interno de clientes</h3>
        <p>
          A empresa mantém um cadastro interno de clientes, preenchido manualmente por sua equipe,
          com razão social, nome fantasia, responsável, CPF ou CNPJ, telefone, e-mail, endereço e
          observações. O site não preenche esse cadastro automaticamente.
        </p>
        <h3>Administrador do painel</h3>
        <p>
          Para a pessoa autorizada que administra o catálogo, tratamos e-mail e senha de acesso (a
          senha é protegida pelo serviço de autenticação). Para proteger o login e a recuperação de
          senha do painel contra tentativas abusivas, guardamos o endereço IP e o e-mail de cada
          tentativa por até 2 dias (a limpeza é feita automaticamente todos os dias).
        </p>
        <h3>Dados técnicos</h3>
        <p>
          Para limitar o envio excessivo de pedidos, guardamos temporariamente o endereço IP e o
          horário da solicitação, sem nenhum dado do pedido.
        </p>
      </section>

      <section aria-labelledby="finalidades">
        <h2 id="finalidades">3. Para que usamos os dados e base legal</h2>
        <div className={estilos.rolagem}>
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th scope="col">Finalidade</th>
                <th scope="col">Base legal (art. 7º da LGPD)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  Montar o pedido que você envia pelo WhatsApp e atender sua compra ou orçamento.
                </td>
                <td>
                  Execução de contrato ou de procedimentos preliminares a pedido do titular (inciso
                  V).
                </td>
              </tr>
              <tr>
                <td>Manter o cadastro interno de clientes.</td>
                <td>Legítimo interesse da empresa (inciso IX), respeitados seus direitos.</td>
              </tr>
              <tr>
                <td>
                  Proteger o login do painel e o envio de pedidos contra abuso (limite de
                  tentativas).
                </td>
                <td>Legítimo interesse (inciso IX), para a segurança do serviço.</td>
              </tr>
              <tr>
                <td>Guardar informações exigidas por lei, como as de natureza fiscal.</td>
                <td>
                  Cumprimento de obrigação legal ou regulatória (inciso II), quando aplicável.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Não usamos seus dados para publicidade de terceiros nem para criar perfis de navegação.
        </p>
      </section>

      <section aria-labelledby="cookies">
        <h2 id="cookies">4. Cookies e armazenamento no navegador</h2>
        <p>
          <strong>Não usamos cookies de rastreamento nem de publicidade.</strong> Também não usamos
          ferramentas de análise de audiência. O site usa apenas o armazenamento do próprio
          navegador (localStorage e sessionStorage), de forma essencial para funcionar:
        </p>
        <div className={estilos.rolagem}>
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Para que serve</th>
                <th scope="col">Por quanto tempo</th>
                <th scope="col">Como apagar</th>
              </tr>
            </thead>
            <tbody>
              {ITENS_ARMAZENAMENTO.map((item) => (
                <tr key={item.chave}>
                  <th scope="row">
                    <code>{item.chave}</code>
                    <span className={estilos.onde}>{item.onde}</span>
                  </th>
                  <td>{item.paraQue}</td>
                  <td>{item.duracao}</td>
                  <td>{item.apagar}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Esses dados ficam somente no seu aparelho e não são enviados a terceiros. Você pode
          apagá-los a qualquer momento nas configurações do navegador.
        </p>
      </section>

      <section aria-labelledby="compartilhamento">
        <h2 id="compartilhamento">5. Compartilhamento de dados</h2>
        <ul>
          <li>
            <strong>Supabase</strong>: fornece o banco de dados, a autenticação do administrador, o
            armazenamento das fotos de produtos e do logotipo e as funções do site. Atua como
            operador, tratando dados em nosso nome. O Supabase pode processar dados em servidores
            fora do Brasil, nos termos do contrato de tratamento de dados do próprio fornecedor.
          </li>
          <li>
            <strong>ViaCEP</strong>: quando você digita um CEP, consultamos esse serviço público
            para preencher rua, bairro, cidade e UF. O seu navegador envia ao ViaCEP apenas o CEP
            (e, como em qualquer acesso à internet, o seu endereço IP); nome, telefone e demais
            dados não são enviados. O mesmo vale quando a empresa cadastra o seu endereço no painel.
          </li>
          <li>
            <strong>WhatsApp (Meta)</strong>: quando, e somente quando, você decide enviar o pedido,
            a mensagem segue pelo WhatsApp, que tem a própria política de privacidade.
          </li>
          <li>
            <strong>Não vendemos</strong> dados pessoais nem os cedemos a terceiros para fins
            comerciais.
          </li>
        </ul>
        <p>Também poderemos compartilhar dados se uma lei ou ordem de autoridade exigir.</p>
      </section>

      <section aria-labelledby="retencao">
        <h2 id="retencao">6. Por quanto tempo guardamos</h2>
        <ul>
          <li>
            <strong>Dados do pedido digitados na loja</strong>: não ficam em nossos servidores;
            ficam na conversa de WhatsApp que você enviou.
          </li>
          <li>
            <strong>Dados salvos no seu aparelho</strong>: até você apagá-los (veja a seção 4).
          </li>
          <li>
            <strong>Cadastro interno de clientes</strong>: enquanto houver relacionamento comercial
            ou necessidade legal, e até você pedir a eliminação, quando cabível.
          </li>
          <li>
            <strong>
              Tentativas de login e de recuperação de senha do painel, e limite de pedidos
            </strong>
            : guardadas por até 2 dias (a limpeza é feita automaticamente todos os dias).
          </li>
        </ul>
      </section>

      <section aria-labelledby="direitos">
        <h2 id="direitos">7. Seus direitos</h2>
        <p>Conforme o art. 18 da LGPD, você pode pedir à empresa:</p>
        <ul>
          <li>confirmação de que tratamos seus dados;</li>
          <li>acesso aos dados;</li>
          <li>correção de dados incompletos, inexatos ou desatualizados;</li>
          <li>
            anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em
            desacordo com a lei;
          </li>
          <li>portabilidade dos dados;</li>
          <li>informação sobre com quem compartilhamos seus dados;</li>
          <li>revogação do consentimento, quando o tratamento se basear nele;</li>
          <li>
            oposição ao tratamento feito com base em legítimo interesse (como o cadastro interno),
            se você discordar dele (art. 18, §2º).
          </li>
        </ul>
        <p>
          Para exercer qualquer desses direitos, fale conosco {contato}. Pode ser necessário
          confirmar sua identidade antes de atender ao pedido. Você também pode apresentar
          reclamação à Autoridade Nacional de Proteção de Dados (ANPD).
        </p>
      </section>

      <section aria-labelledby="seguranca">
        <h2 id="seguranca">8. Segurança</h2>
        <ul>
          <li>O site é acessado por conexão segura (HTTPS).</li>
          <li>O painel de administração exige login e é restrito ao administrador.</li>
          <li>
            Coletamos o mínimo de dados necessário: o pedido feito na loja nem chega a ser guardado
            em nossos servidores.
          </li>
        </ul>
      </section>

      <section aria-labelledby="alteracoes">
        <h2 id="alteracoes">9. Alterações desta política</h2>
        <p>
          Podemos atualizar esta política para refletir mudanças no site ou na lei. A versão em
          vigor é sempre a publicada nesta página.
        </p>
        <UltimaAtualizacao />
      </section>
    </article>
  );
}
