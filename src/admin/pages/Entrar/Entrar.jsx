import { Link, Navigate, useSearchParams } from 'react-router-dom';
import Aviso from '../../../shared/components/Aviso';
import Botao from '../../../shared/components/Botao';
import Campo from '../../../shared/components/Campo';
import PaginaFormulario from '../../../shared/components/PaginaFormulario';
import { useFocoNoPrimeiroErro } from '../../../shared/hooks/useFocoNoPrimeiroErro.js';
import { destinoDoPainel, useEntrar } from '../../hooks/useEntrar.js';
import { useSessaoAdmin } from '../../hooks/useSessaoAdmin.js';
import { useTituloDaPagina } from '../../hooks/useTituloDaPagina.js';
import TelaPublica from '../../components/TelaPublica';
import estilos from './Entrar.module.css';

export default function Entrar() {
  useTituloDaPagina('Entrar');
  const { usuario } = useSessaoAdmin();
  const [parametros] = useSearchParams();
  const { valores, erros, aviso, enviando, mudar, entrar } = useEntrar();
  const formRef = useFocoNoPrimeiroErro(erros);

  // Já logado (inclusive logo após o login): segue para o destino em vez de mostrar o formulário.
  if (usuario) return <Navigate to={destinoDoPainel(parametros.get('voltar'))} replace />;

  return (
    <TelaPublica>
      <PaginaFormulario
        titulo="Entrar"
        subtitulo="Acesse com o e-mail e a senha de administrador."
        onSubmit={entrar}
        formRef={formRef}
      >
        <Aviso>{aviso}</Aviso>
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
        <Campo
          label="Senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          value={valores.senha}
          erro={erros.senha}
          onChange={(e) => mudar('senha', e.target.value)}
          required
        />
        <Botao type="submit" carregando={enviando}>
          Entrar
        </Botao>
        <Link to="/esqueci-senha" className={estilos.esqueci}>
          Esqueci minha senha
        </Link>
      </PaginaFormulario>
    </TelaPublica>
  );
}
