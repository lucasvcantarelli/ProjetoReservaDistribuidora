import { useEffect, useRef, useState } from 'react';
import Botao from '../../../shared/components/Botao';
import FormularioCategoria from '../../components/FormularioCategoria';
import ControlesOrdem from '../../components/ControlesOrdem';
import Modal from '../../../shared/components/Modal';
import PaginaAdmin from '../../components/PaginaAdmin';
import Selo from '../../components/Selo';
import TabelaDados from '../../components/TabelaDados';
import { useCategorias } from '../../hooks/useCategorias.js';
import { useTituloDaPagina } from '../../hooks/useTituloDaPagina.js';
import Aviso from '../../../shared/components/Aviso';
import estilos from './Categorias.module.css';

const VAZIO = {
  titulo: 'Nenhuma categoria ainda.',
  texto: 'Crie a primeira categoria para organizar os produtos da loja.',
};

export default function Categorias() {
  useTituloDaPagina('Categorias');
  const c = useCategorias();
  // null = fechado; { categoria: null } = nova; { categoria } = edição.
  const [edicao, setEdicao] = useState(null);
  const tabelaRef = useRef(null);

  // Depois de reordenar a linha muda de lugar: devolve o foco à seta que acabou de ser usada.
  useEffect(() => {
    if (!c.movimento) return;
    const { id, foco } = c.movimento;
    tabelaRef.current?.querySelector(`[data-seta="${id}:${foco}"]`)?.focus();
  }, [c.movimento]);

  const colunas = [
    {
      chave: 'ordem',
      titulo: 'Ordem',
      celula: (categoria, indice) => (
        <ControlesOrdem
          id={categoria.id}
          nome={categoria.nome}
          primeira={indice === 0}
          ultima={indice === c.itens.length - 1}
          ocupado={c.ocupado}
          onMover={(delta) => c.mover(categoria, delta)}
        />
      ),
    },
    { chave: 'nome', titulo: 'Nome' },
    { chave: 'slug', titulo: 'Slug' },
    {
      chave: 'ativo',
      titulo: 'Status',
      celula: ({ ativo }) => (
        <Selo tipo={ativo ? 'sucesso' : 'neutro'}>{ativo ? 'Ativa' : 'Inativa'}</Selo>
      ),
    },
  ];

  const acoes = (categoria) => (
    <>
      <Botao
        variante="secundario"
        aria-label={`Editar ${categoria.nome}`}
        onClick={() => setEdicao({ categoria })}
      >
        Editar
      </Botao>
      <Botao
        variante="texto"
        className={estilos.excluir}
        disabled={c.ocupado}
        aria-label={`Excluir ${categoria.nome}`}
        onClick={() => c.excluir(categoria)}
      >
        Excluir
      </Botao>
    </>
  );

  const salvar = (dados) =>
    edicao.categoria ? c.editar(edicao.categoria.id, dados) : c.criar(dados);

  return (
    <PaginaAdmin
      titulo="Categorias"
      acoes={<Botao onClick={() => setEdicao({ categoria: null })}>Nova categoria</Botao>}
    >
      {c.erroCarga ? (
        <div className={estilos.falha}>
          <Aviso>{c.erroCarga.message}</Aviso>
          <Botao variante="secundario" onClick={c.recarregar}>
            Tentar novamente
          </Botao>
        </div>
      ) : (
        <div ref={tabelaRef}>
          <TabelaDados
            rotulo="Categorias"
            colunas={colunas}
            itens={c.itens}
            carregando={c.carregando}
            vazio={VAZIO}
            acoes={acoes}
          />
        </div>
      )}
      <Modal
        aberto={!!edicao}
        titulo={edicao?.categoria ? 'Editar categoria' : 'Nova categoria'}
        onFechar={() => setEdicao(null)}
      >
        <FormularioCategoria
          categoria={edicao?.categoria}
          onSalvar={salvar}
          onFechar={() => setEdicao(null)}
        />
      </Modal>
      <p role="status" className="sr-only">
        {c.movimento?.anuncio}
      </p>
    </PaginaAdmin>
  );
}
