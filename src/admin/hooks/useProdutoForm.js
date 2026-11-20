import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '../../shared/hooks/useConfirm.js';
import { useAvisoSaidaSemSalvar } from '../../shared/hooks/useAvisoSaidaSemSalvar.js';
import { useFormulario } from '../../shared/hooks/useFormulario.js';
import { useToast } from '../../shared/hooks/useToast.js';
import { ErroApi } from '../../shared/services/api.js';
import { produtosService } from '../services/produtosService.js';
import {
  formularioParaPayload,
  formularioVazio,
  instantaneo,
  produtoParaFormulario,
  traduzirCampos,
  validarFormulario,
  variacaoVazia,
} from '../utils/produtoForm.js';
import { useSessaoExpirada } from './useSessaoExpirada.js';

const ROTA_PRODUTOS = '/produtos';
const MSG_CONFIRA = 'Confira os campos destacados em vermelho.';
const MSG_CRIADO = 'Produto criado. Agora adicione as fotos.';
const MSG_ATUALIZADO = 'Produto atualizado.';

function trocarDePosicao(lista, indice, delta) {
  const destino = indice + delta;
  if (destino < 0 || destino >= lista.length) return lista;
  const nova = [...lista];
  [nova[indice], nova[destino]] = [nova[destino], nova[indice]];
  return nova;
}

// Erros que sobram depois de mexer num tamanho: some o do campo editado (e, ao trocar a forma de
// venda, os de preço/quantidade daquele tamanho).
function semErrosDoCampo(erros, indice, campo) {
  const prefixo = `variacoes.${indice}`;
  const limpaTudo = campo.startsWith('vende_');
  return Object.fromEntries(
    Object.entries(erros).filter(([chave]) => {
      if (chave === prefixo) return false;
      if (!chave.startsWith(`${prefixo}.`)) return true;
      return !limpaTudo && chave !== `${prefixo}.${campo}`;
    }),
  );
}

const semErrosDeVariacoes = (erros) =>
  Object.fromEntries(Object.entries(erros).filter(([chave]) => !chave.startsWith('variacoes')));

// Orquestra o formulário de produto (novo ou edição): valores, tamanhos, validação, gravação e o aviso
// de alterações não salvas. `produto`: resposta de `obter` ou null para produto novo.
export function useProdutoForm(produto) {
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { confirmar } = useConfirm();
  const id = produto?.id;
  const sessaoExpirou = useSessaoExpirada(id ? `${ROTA_PRODUTOS}/${id}` : `${ROTA_PRODUTOS}/novo`);
  const [inicial] = useState(() => (produto ? produtoParaFormulario(produto) : formularioVazio()));
  const formulario = useFormulario(inicial);
  const { valores, definirValores, setErros, setAviso, submeter } = formulario;
  const [base, setBase] = useState(() => instantaneo(inicial));
  const [movimento, setMovimento] = useState(null);
  const sujo = instantaneo(valores) !== base;
  const { liberarSaida } = useAvisoSaidaSemSalvar(sujo);

  function mudarVariacao(indice, campo, valor) {
    definirValores((atual) => ({
      ...atual,
      variacoes: atual.variacoes.map((v, i) => (i === indice ? { ...v, [campo]: valor } : v)),
    }));
    setErros((atuais) => semErrosDoCampo(atuais, indice, campo));
  }

  function adicionarVariacao() {
    definirValores((atual) => ({ ...atual, variacoes: [...atual.variacoes, variacaoVazia()] }));
    setErros((atuais) => semErrosDeVariacoes(atuais));
  }

  async function removerVariacao(indice) {
    const variacao = valores.variacoes[indice];
    if (variacao.id) {
      const nome = variacao.nome_tamanho.trim() || 'este tamanho';
      const confirmado = await confirmar({
        titulo: `Remover ${nome}?`,
        texto: 'Ele deixa de aparecer na loja assim que você salvar o produto.',
        textoConfirmar: 'Remover',
        variante: 'perigo',
      });
      if (!confirmado) return;
    }
    definirValores((atual) => ({
      ...atual,
      variacoes: atual.variacoes.filter((_, i) => i !== indice),
    }));
    setErros((atuais) => semErrosDeVariacoes(atuais));
  }

  function moverVariacao(indice, delta) {
    const variacao = valores.variacoes[indice];
    const destino = indice + delta;
    definirValores((atual) => ({
      ...atual,
      variacoes: trocarDePosicao(atual.variacoes, indice, delta),
    }));
    setErros((atuais) => semErrosDeVariacoes(atuais));
    const noLimite = destino === (delta < 0 ? 0 : valores.variacoes.length - 1);
    setMovimento({
      chave: variacao.chave,
      foco: delta < 0 === noLimite ? 'baixo' : 'cima',
      anuncio: `Tamanho movido para a posição ${destino + 1}.`,
      n: (movimento?.n ?? 0) + 1,
    });
  }

  // Devolve o produto gravado, ou undefined se falhou (erros por campo/aviso já ficam no formulário).
  async function gravar() {
    const payload = formularioParaPayload(valores);
    try {
      return id ? await produtosService.editar(id, payload) : await produtosService.criar(payload);
    } catch (erro) {
      // Sessão vencida (o login já foi acionado) e falhas inesperadas seguem para `submeter`.
      if (!(erro instanceof ErroApi) || sessaoExpirou(erro)) throw erro;
      setErros(traduzirCampos(erro.campos ?? {}));
      setAviso(erro.message);
      return undefined;
    }
  }

  async function salvar(evento) {
    evento.preventDefault();
    const invalidos = validarFormulario(valores);
    if (Object.keys(invalidos).length > 0) {
      setErros(invalidos);
      setAviso(MSG_CONFIRA);
      return;
    }
    setErros({});
    const gravado = await submeter(gravar);
    if (!gravado) return;
    if (id) {
      const atualizado = produtoParaFormulario(gravado);
      definirValores(atualizado);
      setBase(instantaneo(atualizado));
      mostrar({ texto: MSG_ATUALIZADO });
      return;
    }
    liberarSaida();
    mostrar({ texto: MSG_CRIADO });
    navigate(`${ROTA_PRODUTOS}/${gravado.id}`, { replace: true });
  }

  return {
    ...formulario,
    id,
    sujo,
    movimento,
    salvar,
    cancelar: () => navigate(ROTA_PRODUTOS),
    mudarVariacao,
    adicionarVariacao,
    removerVariacao,
    moverVariacao,
  };
}
