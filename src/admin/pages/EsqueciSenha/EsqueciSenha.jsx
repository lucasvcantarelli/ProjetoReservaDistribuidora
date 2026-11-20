import { Link } from 'react-router-dom';
import Aviso from '../../../shared/components/Aviso';
import Botao from '../../../shared/components/Botao';
import Campo from '../../../shared/components/Campo';
import PaginaFormulario from '../../../shared/components/PaginaFormulario';
import { useFocoNoPrimeiroErro } from '../../../shared/hooks/useFocoNoPrimeiroErro.js';
import TelaPublica from '../../components/TelaPublica';
import { useEsqueciSenha } from '../../hooks/useEsqueciSenha.js';
import { useTituloDaPagina } from '../../hooks/useTituloDaPagina.js';

export default function EsqueciSenha() {
  useTituloDaPagina('Esqueci minha senha');
  const { valores, erros, aviso, enviando, mensagem, mudar, enviar } = useEsqueciSenha();
  const formRef = useFocoNoPrimeiroErro(erros);

  return (
    <TelaPublica>
      <PaginaFormulario
        titulo="Esqueci minha senha"
        subtitulo="Informe o e-mail do administrador para receber o link de redefinição."
        onSubmit={enviar}
        formRef={formRef}
        rodape={<Link to="/entrar">Voltar para o login</Link>}
      >
        <Aviso>{aviso}</Aviso>
        <Aviso tipo="sucesso">{mensagem}</Aviso>
        <Campo
          label="E-mail"
          name="email"
          type="email"
          autoComplete="username"
          value={valores.email}
          erro={erros.email}
          onChange={(e) => mudar('email', e.target.value)}
          required
        />
        <Botao type="submit" carregando={enviando}>
          Enviar link
        </Botao>
      </PaginaFormulario>
    </TelaPublica>
  );
}
