import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Botao from '../../../shared/components/Botao';
import Paginacao from '../../../shared/components/Paginacao';
import { formatarReais } from '../../../shared/utils/formatar.js';
import FalhaDeCarga from '../../components/FalhaDeCarga';
import MiniaturaProduto from '../../components/MiniaturaProduto';
import PaginaAdmin from '../../components/PaginaAdmin';
import Selo from '../../components/Selo';
import TabelaDados from '../../components/TabelaDados';
import { useCategorias } from '../../hooks/useCategorias.js';
import { useFiltrosDeLista } from '../../hooks/useFiltrosDeLista.js';
import { useProdutos } from '../../hooks/useProdutos.js';
import { useTituloDaPagina } from '../../hooks/useTituloDaPagina.js';
import estilos from './Produtos.module.css';

const ROTA_PRODUTOS = '/produtos';
const SEM_DADO = '—';

function mensagemVazia({ busca, categoriaId }) {
  if (busca || categoriaId) {
    return { titulo: 'Nenhum produto encontrado.', texto: 'Tente outra busca ou outra categoria.' };
  }
  return {
    titulo: 'Nenhum produto ainda.',
    texto: 'Cadastre o primeiro produto para ele aparecer na loja.',
  };
}

function textoTamanhos(total) {
  return total === 1 ? '1 tamanho' : `${total} tamanhos`;
}

export default function Produtos() {
  useTituloDaPagina('Produtos');
  const navigate = useNavigate();
  const filtros = useFiltrosDeLista();
  const produtos = useProdutos(filtros);
  const categorias = useCategorias(ROTA_PRODUTOS).itens;
  const { pagina, mudarPagina } = filtros;
  const { carregando, itens, totalPaginas } = produtos;

  // Excluiu o último item de uma página que deixou de existir: volta para a última página.
  useEffect(() => {
    if (!carregando && itens.length === 0 && pagina > totalPaginas) mudarPagina(totalPaginas);
  }, [carregando, itens.length, pagina, totalPaginas, mudarPagina]);

  const colunas = [
    { chave: 'foto', titulo: 'Foto', celula: (p) => <MiniaturaProduto url={p.foto_url} /> },
    { chave: 'nome', titulo: 'Nome' },
    {
      chave: 'categoria_nome',
      titulo: 'Categoria',
      celula: (p) => p.categoria_nome ?? SEM_DADO,
    },
    {
      chave: 'preco',
      titulo: 'A partir de',
      celula: (p) => (p.a_partir_de_centavos ? formatarReais(p.a_partir_de_centavos) : SEM_DADO),
    },
    { chave: 'tamanhos', titulo: 'Tamanhos', celula: (p) => textoTamanhos(p.total_variacoes) },
    {
      chave: 'ativo',
      titulo: 'Status',
      celula: ({ ativo }) => (
        <Selo tipo={ativo ? 'sucesso' : 'neutro'}>{ativo ? 'Ativo' : 'Inativo'}</Selo>
      ),
    },
  ];

  const acoes = (produto) => (
    <>
      <Botao
        variante="secundario"
        aria-label={`Editar ${produto.nome}`}
        onClick={() => navigate(`${ROTA_PRODUTOS}/${produto.id}`)}
      >
        Editar
      </Botao>
      <Botao
        variante="texto"
        className={estilos.excluir}
        disabled={produtos.excluindo}
        aria-label={`Excluir ${produto.nome}`}
        onClick={() => produtos.excluir(produto)}
      >
        Excluir
      </Botao>
    </>
  );

  return (
    <PaginaAdmin
      titulo="Produtos"
      acoes={<Botao onClick={() => navigate(`${ROTA_PRODUTOS}/novo`)}>Novo produto</Botao>}
    >
      <div className={estilos.filtros} role="search">
        <label className={estilos.filtro}>
          <span className={estilos.rotulo}>Buscar</span>
          <input
            type="search"
            className={estilos.controle}
            placeholder="Nome do produto"
            value={filtros.texto}
            onChange={(e) => filtros.setTexto(e.target.value)}
          />
        </label>
        <label className={estilos.filtro}>
          <span className={estilos.rotulo}>Categoria</span>
          <select
            className={estilos.controle}
            value={filtros.categoriaId}
            onChange={(e) => filtros.mudarCategoria(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
      </div>
      {produtos.erro ? (
        <FalhaDeCarga erro={produtos.erro} onTentarDeNovo={produtos.recarregar} />
      ) : (
        <>
          <TabelaDados
            rotulo="Produtos"
            colunas={colunas}
            itens={produtos.itens}
            carregando={produtos.carregando}
            vazio={mensagemVazia(filtros)}
            acoes={acoes}
          />
          {produtos.totalPaginas > 1 && (
            <Paginacao
              pagina={filtros.pagina}
              totalPaginas={produtos.totalPaginas}
              onMudar={filtros.mudarPagina}
            />
          )}
        </>
      )}
    </PaginaAdmin>
  );
}
