import { useRef, useState } from 'react';
import { MAX_FOTOS } from '../../../supabase/functions/_shared/domain/produto.js';
import { useConfirm } from '../../shared/hooks/useConfirm.js';
import { useToast } from '../../shared/hooks/useToast.js';
import { ErroApi } from '../../shared/services/api.js';
import { fotosService } from '../services/fotosService.js';
import { comprimirImagem } from '../utils/comprimirImagem.js';
import { useSessaoExpirada } from './useSessaoExpirada.js';

export const STATUS_COMPRIMINDO = 'comprimindo';
export const STATUS_ENVIANDO = 'enviando';
export const STATUS_ERRO = 'erro';

const MSG_ERRO_INESPERADO = 'Não foi possível enviar esta foto. Tente de novo.';

function trocarDePosicao(ids, indice, delta) {
  const destino = indice + delta;
  if (destino < 0 || destino >= ids.length) return null;
  const novos = [...ids];
  [novos[indice], novos[destino]] = [novos[destino], novos[indice]];
  return novos;
}

function avisoDeLimite(vagas) {
  if (vagas <= 0) {
    return `Este produto já tem ${MAX_FOTOS} fotos (o máximo). Remova uma para adicionar outra.`;
  }
  const plural = vagas === 1 ? 'mais 1 foto' : `mais ${vagas} fotos`;
  return `Cada produto pode ter no máximo ${MAX_FOTOS} fotos. Só cabem ${plural}; as demais foram ignoradas.`;
}

// Fotos do produto: envio (comprime no navegador e envia uma por vez), remoção e ordem.
// `produto`: resposta de `obter` ou null (produto ainda não salvo: sem fotos).
export function useGaleriaFotos(produto) {
  const id = produto?.id;
  const { mostrar } = useToast();
  const { confirmar } = useConfirm();
  const sessaoExpirou = useSessaoExpirada(`/produtos/${id}`);
  const [fotos, setFotos] = useState(produto?.fotos ?? []);
  const [envios, setEnvios] = useState([]);
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [movimento, setMovimento] = useState(null);
  const fila = useRef(Promise.resolve());
  const contador = useRef(0);

  function atualizarEnvio(chave, mudancas) {
    setEnvios((atuais) => atuais.map((e) => (e.chave === chave ? { ...e, ...mudancas } : e)));
  }

  async function processar(envio) {
    atualizarEnvio(envio.chave, { status: STATUS_COMPRIMINDO, erro: null });
    try {
      const blob = await comprimirImagem(envio.arquivo);
      atualizarEnvio(envio.chave, { status: STATUS_ENVIANDO });
      const foto = await fotosService.enviar(id, blob);
      setFotos((atuais) => [...atuais, foto]);
      setEnvios((atuais) => atuais.filter((e) => e.chave !== envio.chave));
    } catch (erro) {
      if (erro instanceof ErroApi && sessaoExpirou(erro)) return;
      atualizarEnvio(envio.chave, {
        status: STATUS_ERRO,
        erro: erro.message || MSG_ERRO_INESPERADO,
      });
    }
  }

  // Um erro inesperado marca só aquela foto e a fila continua andando.
  const enfileirar = (envio) => {
    fila.current = fila.current
      .then(() => processar(envio))
      .catch((erro) =>
        atualizarEnvio(envio.chave, {
          status: STATUS_ERRO,
          erro: erro?.message || MSG_ERRO_INESPERADO,
        }),
      );
  };

  // `arquivos`: FileList/array vindo do seletor ou do arrastar e soltar.
  function adicionar(arquivos) {
    const lista = Array.from(arquivos);
    const emAndamento = envios.filter((e) => e.status !== STATUS_ERRO).length;
    const vagas = MAX_FOTOS - fotos.length - emAndamento;
    setAviso(lista.length > vagas ? avisoDeLimite(vagas) : '');
    const novos = lista.slice(0, Math.max(0, vagas)).map((arquivo) => ({
      chave: ++contador.current,
      nome: arquivo.name,
      arquivo,
      status: STATUS_COMPRIMINDO,
      erro: null,
    }));
    if (novos.length === 0) return;
    setEnvios((atuais) => [...atuais, ...novos]);
    novos.forEach(enfileirar);
  }

  function tentarDeNovo(chave) {
    const envio = envios.find((e) => e.chave === chave);
    if (!envio) return;
    const emAndamento = envios.filter((e) => e.status !== STATUS_ERRO).length;
    if (fotos.length + emAndamento + 1 > MAX_FOTOS) {
      setAviso(avisoDeLimite(MAX_FOTOS - fotos.length - emAndamento));
      return;
    }
    setAviso('');
    enfileirar(envio);
  }
  const descartar = (chave) => setEnvios((atuais) => atuais.filter((e) => e.chave !== chave));

  // Ações de uma foto já enviada: falha vira aviso com a mensagem do servidor.
  async function comAviso(acao) {
    setOcupado(true);
    try {
      return await acao();
    } catch (erro) {
      if (!(erro instanceof ErroApi)) throw erro;
      if (!sessaoExpirou(erro)) mostrar({ tipo: 'erro', texto: erro.message });
      return undefined;
    } finally {
      setOcupado(false);
    }
  }

  async function remover(foto) {
    const confirmado = await confirmar({
      titulo: 'Remover esta foto?',
      texto: 'A foto será apagada. Não dá para desfazer.',
      textoConfirmar: 'Remover',
      variante: 'perigo',
    });
    if (!confirmado) return;
    const removida = await comAviso(() => fotosService.remover(foto.id));
    if (!removida) return;
    setFotos((atuais) => atuais.filter((f) => f.id !== foto.id));
    setAviso('');
    mostrar({ texto: 'Foto removida.' });
  }

  async function mover(foto, delta) {
    const ids = fotos.map((f) => f.id);
    const novos = trocarDePosicao(ids, ids.indexOf(foto.id), delta);
    if (!novos) return;
    const lista = await comAviso(() => fotosService.reordenar(id, novos));
    if (!lista) return;
    setFotos(lista);
    const posicao = lista.findIndex((f) => f.id === foto.id);
    const noLimite = posicao === (delta < 0 ? 0 : lista.length - 1);
    setMovimento({
      id: foto.id,
      foco: delta < 0 === noLimite ? 'baixo' : 'cima',
      anuncio: `Foto movida para a posição ${posicao + 1}.`,
      n: (movimento?.n ?? 0) + 1,
    });
  }

  return {
    habilitada: !!id,
    fotos,
    envios,
    aviso,
    ocupado,
    movimento,
    adicionar,
    tentarDeNovo,
    descartar,
    remover,
    mover,
  };
}
