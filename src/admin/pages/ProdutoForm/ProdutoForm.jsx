import { useParams } from 'react-router-dom';
import Carregando from '../../../shared/components/Carregando';
import FalhaDeCarga from '../../components/FalhaDeCarga';
import FormularioProduto from '../../components/FormularioProduto';
import PaginaAdmin from '../../components/PaginaAdmin';
import { useCategorias } from '../../hooks/useCategorias.js';
import { useProdutoPorId } from '../../hooks/useProdutoPorId.js';
import { useTituloDaPagina } from '../../hooks/useTituloDaPagina.js';

// Novo produto (/produtos/novo) ou edição (/produtos/:id): espera o produto e as categorias chegarem.
export default function ProdutoForm() {
  const { id } = useParams();
  const titulo = id ? 'Editar produto' : 'Novo produto';
  useTituloDaPagina(titulo);
  const carga = useProdutoPorId(id);
  const categorias = useCategorias(id ? `/produtos/${id}` : '/produtos/novo');

  function corpo() {
    if (carga.erro) return <FalhaDeCarga erro={carga.erro} onTentarDeNovo={carga.recarregar} />;
    if (categorias.erroCarga) {
      return <FalhaDeCarga erro={categorias.erroCarga} onTentarDeNovo={categorias.recarregar} />;
    }
    if (carga.carregando || categorias.carregando) return <Carregando />;
    return (
      <FormularioProduto
        key={id ?? 'novo'}
        produto={id ? carga.produto : null}
        categorias={categorias.itens}
      />
    );
  }

  return <PaginaAdmin titulo={titulo}>{corpo()}</PaginaAdmin>;
}
