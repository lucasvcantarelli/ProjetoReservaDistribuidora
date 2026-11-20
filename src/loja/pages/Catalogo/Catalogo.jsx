import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Botao from '../../../shared/components/Botao';
import Paginacao from '../../../shared/components/Paginacao';
import ChipsCategorias from '../../components/ChipsCategorias';
import EstadoVazio from '../../components/EstadoVazio';
import GradeProdutos from '../../components/GradeProdutos';
import { useCatalogo } from '../../hooks/useCatalogo.js';
import estilos from './Catalogo.module.css';

const PRIMEIRA_PAGINA = 1;

function lerPagina(params) {
  const pagina = Number(params.get('pagina'));
  return Number.isInteger(pagina) && pagina >= PRIMEIRA_PAGINA ? pagina : PRIMEIRA_PAGINA;
}

function tituloDaPagina({ busca, categoria }) {
  if (busca) return `Resultados para “${busca}”`;
  return categoria?.nome ?? 'Todos os produtos';
}

function mensagemVazia({ busca, categoriaSlug }) {
  if (busca) return 'Nenhum produto encontrado para essa busca.';
  if (categoriaSlug) return 'Nenhum produto nesta categoria.';
  return 'Nenhum produto cadastrado ainda.';
}

export default function Catalogo() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const busca = (params.get('busca') ?? '').trim();
  const pagina = lerPagina(params);

  const catalogo = useCatalogo({ categoriaSlug: slug, busca, pagina });
  const categoria = catalogo.categorias.find((c) => c.slug === slug);

  function mudarPagina(nova) {
    const proximos = new URLSearchParams(params);
    if (nova > PRIMEIRA_PAGINA) proximos.set('pagina', String(nova));
    else proximos.delete('pagina');
    setParams(proximos);
    window.scrollTo({ top: 0 });
  }

  function corpo() {
    if (catalogo.erro) {
      return (
        <EstadoVazio
          role="alert"
          titulo="Não foi possível carregar os produtos."
          texto={catalogo.erro.message}
        >
          <Botao onClick={catalogo.recarregar}>Tentar novamente</Botao>
        </EstadoVazio>
      );
    }
    if (catalogo.carregando) return <GradeProdutos itens={[]} carregando />;
    if (catalogo.itens.length === 0) {
      return (
        <EstadoVazio titulo={mensagemVazia({ busca, categoriaSlug: slug })}>
          {(busca || slug) && (
            <Botao variante="secundario" onClick={() => navigate('/')}>
              Ver todos os produtos
            </Botao>
          )}
        </EstadoVazio>
      );
    }
    return (
      <>
        <GradeProdutos itens={catalogo.itens} />
        {catalogo.totalPaginas > 1 && (
          <Paginacao pagina={pagina} totalPaginas={catalogo.totalPaginas} onMudar={mudarPagina} />
        )}
      </>
    );
  }

  return (
    <>
      <ChipsCategorias categorias={catalogo.categorias} />
      <h1 className={estilos.titulo}>{tituloDaPagina({ busca, categoria })}</h1>
      {corpo()}
    </>
  );
}
