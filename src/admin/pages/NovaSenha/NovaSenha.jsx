import { Link } from 'react-router-dom';
import Aviso from '../../../shared/components/Aviso';
import Botao from '../../../shared/components/Botao';
import Campo from '../../../shared/components/Campo';
import PaginaFormulario from '../../../shared/components/PaginaFormulario';
import { useFocoNoPrimeiroErro } from '../../../shared/hooks/useFocoNoPrimeiroErro.js';
import TelaPublica from '../../components/TelaPublica';
import { useNovaSenha } from '../../hooks/useNovaSenha.js';
import { useTituloDaPagina } from '../../hooks/useTituloDaPagina.js';

const LINK_NOVO_PEDIDO = <Link to="/esqueci-senha">Solicitar novo link</Link>;

export default function NovaSenha() {
  useTituloDaPagina('Nova senha');
  const { valores, erros, aviso, enviando, linkValido, mudar, enviar } = useNovaSenha();
  const formRef = useFocoNoPrimeiroErro(erros);

  if (!linkValido) {
    return (
      <TelaPublica>
        <PaginaFormulario
          titulo="Link inválido ou expirado"
          subtitulo="Este link de redefinição não pode ser usado. Peça um novo."
          rodape={LINK_NOVO_PEDIDO}
        />
      </TelaPublica>
    );
  }

  return (
    <TelaPublica>
      <PaginaFormulario
        titulo="Nova senha"
        subtitulo="Escolha a nova senha de administrador."
        onSubmit={enviar}
        formRef={formRef}
        rodape={LINK_NOVO_PEDIDO}
      >
        <Aviso>{aviso}</Aviso>
        <Campo
          label="Nova senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          value={valores.senha}
          erro={erros.senha}
          onChange={(e) => mudar('senha', e.target.value)}
          required
        />
        <Campo
          label="Confirmar nova senha"
          name="confirmar"
          type="password"
          autoComplete="new-password"
          value={valores.confirmar}
          erro={erros.confirmar}
          onChange={(e) => mudar('confirmar', e.target.value)}
          required
        />
        <Botao type="submit" carregando={enviando}>
          Salvar nova senha
        </Botao>
      </PaginaFormulario>
    </TelaPublica>
  );
}
