import { useEffect, useRef } from 'react';
import Botao from '../../../shared/components/Botao';
import { MAX_VARIACOES } from '../../../../supabase/functions/_shared/domain/produto.js';
import CartaoVariacao from '../CartaoVariacao';
import estilos from './EditorVariacoes.module.css';

const FORMA_DE_VENDA = 'forma';

// Erros do formulário ({ 'variacoes.0.nome_tamanho': msg, 'variacoes.0': msg }) -> chaves curtas de um cartão.
function errosDoCartao(erros, indice) {
  const prefixo = `variacoes.${indice}`;
  const resultado = {};
  if (erros[prefixo]) resultado[FORMA_DE_VENDA] = erros[prefixo];
  for (const [campo, mensagem] of Object.entries(erros)) {
    if (campo.startsWith(`${prefixo}.`)) resultado[campo.slice(prefixo.length + 1)] = mensagem;
  }
  return resultado;
}

// Lista de tamanhos do produto como cartões, com adicionar, remover e reordenar.
// `movimento` ({ chave, foco, anuncio, n }): devolve o foco à seta usada depois de reordenar.
export default function EditorVariacoes({
  variacoes,
  erros,
  ocupado,
  movimento,
  onAdicionar,
  onMudar,
  onMover,
  onRemover,
}) {
  const listaRef = useRef(null);

  useEffect(() => {
    if (!movimento) return;
    const seta = `[data-seta="${movimento.chave}:${movimento.foco}"]`;
    listaRef.current?.querySelector(seta)?.focus();
  }, [movimento]);

  return (
    <div className={estilos.editor}>
      <div ref={listaRef} className={estilos.lista}>
        {variacoes.map((variacao, indice) => (
          <CartaoVariacao
            key={variacao.chave}
            variacao={variacao}
            indice={indice}
            total={variacoes.length}
            erros={errosDoCartao(erros, indice)}
            ocupado={ocupado}
            onMudar={(campo, valor) => onMudar(indice, campo, valor)}
            onMover={(delta) => onMover(indice, delta)}
            onRemover={() => onRemover(indice)}
          />
        ))}
      </div>
      {erros.variacoes && (
        <p className={estilos.erro} role="alert">
          {erros.variacoes}
        </p>
      )}
      <Botao
        variante="secundario"
        className={estilos.adicionar}
        disabled={variacoes.length >= MAX_VARIACOES}
        aria-invalid={erros.variacoes ? true : undefined}
        onClick={onAdicionar}
      >
        + Adicionar tamanho
      </Botao>
      <p role="status" className="sr-only">
        {movimento?.anuncio}
      </p>
    </div>
  );
}
