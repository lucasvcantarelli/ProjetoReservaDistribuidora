import { useCallback, useEffect, useRef, useState } from 'react';
import { useAsync } from '../../shared/hooks/useAsync.js';
import { useConfirm } from '../../shared/hooks/useConfirm.js';
import { useToast } from '../../shared/hooks/useToast.js';
import { ErroApi } from '../../shared/services/api.js';
import { categoriasService } from '../services/categoriasService.js';
import { useSessaoExpirada } from './useSessaoExpirada.js';

const ROTA_CATEGORIAS = '/categorias';
const MSG_CRIADA = 'Categoria criada.';
const MSG_ATUALIZADA = 'Categoria atualizada.';
const MSG_EXCLUIDA = 'Categoria excluída.';

function trocarDePosicao(ids, indice, delta) {
  const destino = indice + delta;
  if (destino < 0 || destino >= ids.length) return null;
  const novos = [...ids];
  [novos[indice], novos[destino]] = [novos[destino], novos[indice]];
  return novos;
}

// Orquestra a tela de categorias: carga, criar, editar, excluir (com confirmação) e reordenar.
// `rota`: para onde voltar depois de um login forçado (outras telas só usam a lista de categorias).
export function useCategorias(rota = ROTA_CATEGORIAS) {
  const { mostrar } = useToast();
  const { confirmar } = useConfirm();
  const sessaoExpirou = useSessaoExpirada(rota);
  const [itens, setItens] = useState([]);
  const [ocupado, setOcupado] = useState(false);
  // Último movimento de ordem: onde devolver o foco e o texto para o leitor de tela.
  const [movimento, setMovimento] = useState(null);
  const contagemMovimentos = useRef(0);
  const carga = useAsync(categoriasService.listar);
  const { executar: carregar, erro: erroCarga } = carga;

  const recarregar = useCallback(async () => {
    const lista = await carregar();
    if (lista) setItens(lista);
  }, [carregar]);

  useEffect(() => {
    carregar().then((lista) => lista && setItens(lista));
  }, [carregar]);

  useEffect(() => {
    if (erroCarga) sessaoExpirou(erroCarga);
  }, [erroCarga, sessaoExpirou]);

  // Erros da API seguem para o chamador; sessão vencida já foi tratada aqui (devolve undefined).
  async function tentar(acao) {
    try {
      return await acao();
    } catch (erro) {
      if (erro instanceof ErroApi && sessaoExpirou(erro)) return undefined;
      throw erro;
    }
  }

  // Devolve true se salvou; ErroApi (validação, 409...) é relançado para o formulário mostrar.
  async function criar({ nome }) {
    const nova = await tentar(() => categoriasService.criar({ nome }));
    if (!nova) return false;
    setItens((atuais) => [...atuais, nova]);
    mostrar({ texto: MSG_CRIADA });
    return true;
  }

  async function editar(id, { nome, ativo }) {
    const atualizada = await tentar(() => categoriasService.editar(id, { nome, ativo }));
    if (!atualizada) return false;
    setItens((atuais) => atuais.map((c) => (c.id === id ? atualizada : c)));
    mostrar({ texto: MSG_ATUALIZADA });
    return true;
  }

  // Ações sem formulário: falha vira aviso (toast) com a mensagem do servidor.
  async function comAviso(acao) {
    setOcupado(true);
    try {
      return await tentar(acao);
    } catch (erro) {
      if (!(erro instanceof ErroApi)) throw erro;
      mostrar({ tipo: 'erro', texto: erro.message });
      return undefined;
    } finally {
      setOcupado(false);
    }
  }

  async function excluir(categoria) {
    const confirmado = await confirmar({
      titulo: 'Excluir categoria?',
      texto: `A categoria "${categoria.nome}" será excluída. Não dá para desfazer.`,
      textoConfirmar: 'Excluir',
      variante: 'perigo',
    });
    if (!confirmado) return;
    const resultado = await comAviso(() => categoriasService.excluir(categoria.id));
    if (!resultado) return;
    setItens((atuais) => atuais.filter((c) => c.id !== categoria.id));
    mostrar({ texto: MSG_EXCLUIDA });
  }

  // delta: -1 sobe, +1 desce; o servidor devolve a lista já reordenada.
  async function mover(categoria, delta) {
    const ids = itens.map((c) => c.id);
    const novos = trocarDePosicao(ids, ids.indexOf(categoria.id), delta);
    if (!novos) return;
    const lista = await comAviso(() => categoriasService.reordenar(novos));
    if (!lista) return;
    setItens(lista);
    const indice = lista.findIndex((c) => c.id === categoria.id);
    const noLimite = indice === (delta < 0 ? 0 : lista.length - 1);
    contagemMovimentos.current += 1;
    setMovimento({
      id: categoria.id,
      foco: delta < 0 === noLimite ? 'baixo' : 'cima',
      anuncio: `${categoria.nome} movida para a posição ${indice + 1}.`,
      n: contagemMovimentos.current,
    });
  }

  return {
    itens,
    carregando: carga.carregando || (!carga.dados && !erroCarga),
    erroCarga,
    recarregar,
    ocupado,
    criar,
    editar,
    excluir,
    mover,
    movimento,
  };
}
