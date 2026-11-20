import { Link } from 'react-router-dom';
import Aviso from '../../../shared/components/Aviso';
import Campo from '../../../shared/components/Campo';
import { useFocoNoPrimeiroErro } from '../../../shared/hooks/useFocoNoPrimeiroErro.js';
import {
  MAX_DESCRICAO,
  MAX_NOME_PRODUTO,
} from '../../../../supabase/functions/_shared/domain/produto.js';
import { useGaleriaFotos } from '../../hooks/useGaleriaFotos.js';
import { useProdutoForm } from '../../hooks/useProdutoForm.js';
import BarraAcoes from '../BarraAcoes';
import EditorVariacoes from '../EditorVariacoes';
import GaleriaFotos from '../GaleriaFotos';
import SecaoFormulario from '../SecaoFormulario';
import estilos from './FormularioProduto.module.css';

// Formulário completo do produto: informações, tamanhos e preços, fotos e a barra de ações.
// `produto`: resposta de `obter` (edição) ou null (novo); `categorias`: as do painel.
export default function FormularioProduto({ produto, categorias }) {
  const f = useProdutoForm(produto);
  const galeria = useGaleriaFotos(produto);
  const formRef = useFocoNoPrimeiroErro(f.erros);
  const { valores, erros } = f;
  const opcoes = categorias.filter((c) => c.ativo || c.id === valores.categoria_id);

  return (
    <form onSubmit={f.salvar} noValidate ref={formRef} className={estilos.formulario}>
      <Aviso>{f.aviso}</Aviso>

      <SecaoFormulario numero="1" titulo="Informações">
        <Campo
          label="Nome do produto"
          value={valores.nome}
          erro={erros.nome}
          maxLength={MAX_NOME_PRODUTO}
          autoComplete="off"
          onChange={(e) => f.mudar('nome', e.target.value)}
        />
        <Campo
          label="Categoria"
          como="select"
          value={valores.categoria_id}
          erro={erros.categoria_id}
          dica={
            opcoes.length === 0 ? (
              <>
                Ainda não há categorias. <Link to="/categorias">Cadastre uma categoria</Link>{' '}
                primeiro.
              </>
            ) : undefined
          }
          onChange={(e) => f.mudar('categoria_id', e.target.value)}
        >
          <option value="">Escolha uma categoria</option>
          {opcoes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Campo>
        <Campo
          label="Descrição (opcional)"
          como="textarea"
          rows={4}
          value={valores.descricao}
          erro={erros.descricao}
          maxLength={MAX_DESCRICAO}
          dica={`${valores.descricao.length} de ${MAX_DESCRICAO} caracteres`}
          onChange={(e) => f.mudar('descricao', e.target.value)}
        />
        <label className={estilos.opcao}>
          <input
            type="checkbox"
            role="switch"
            checked={valores.ativo}
            onChange={(e) => f.mudar('ativo', e.target.checked)}
          />
          Produto ativo (aparece na loja)
        </label>
      </SecaoFormulario>

      <SecaoFormulario
        numero="2"
        titulo="Tamanhos e preços"
        texto="Cadastre cada tamanho e diga se ele é vendido por unidade, por fardo ou dos dois jeitos."
      >
        <EditorVariacoes
          variacoes={valores.variacoes}
          erros={erros}
          movimento={f.movimento}
          onAdicionar={f.adicionarVariacao}
          onMudar={f.mudarVariacao}
          onMover={f.moverVariacao}
          onRemover={f.removerVariacao}
        />
      </SecaoFormulario>

      <SecaoFormulario
        numero="3"
        titulo="Fotos"
        texto="Até 10 fotos. Elas são reduzidas no seu aparelho antes de enviar."
      >
        <GaleriaFotos galeria={galeria} />
      </SecaoFormulario>

      <BarraAcoes enviando={f.enviando} onCancelar={f.cancelar} />
    </form>
  );
}
