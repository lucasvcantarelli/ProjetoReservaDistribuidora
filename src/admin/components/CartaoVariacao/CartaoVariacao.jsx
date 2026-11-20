import Botao from '../../../shared/components/Botao';
import Campo from '../../../shared/components/Campo';
import { MAX_NOME_TAMANHO } from '../../../../supabase/functions/_shared/domain/produto.js';
import { resumoDoFardo } from '../../utils/produtoForm.js';
import CampoPreco from '../CampoPreco';
import ControlesOrdem from '../ControlesOrdem';
import estilos from './CartaoVariacao.module.css';

const SO_DIGITOS = /\D/g;

// Um tamanho do produto: nome + formas de venda (unidade e/ou fardo) com seus preços.
// `erros` usa as chaves curtas: nome_tamanho, forma, preco_unidade_centavos, qtd_por_fardo, preco_fardo_centavos.
export default function CartaoVariacao({
  variacao,
  indice,
  total,
  erros,
  ocupado,
  onMudar,
  onMover,
  onRemover,
}) {
  const nome = variacao.nome_tamanho.trim() || `tamanho ${indice + 1}`;
  const fardo = resumoDoFardo(variacao);

  return (
    <fieldset className={estilos.cartao}>
      <legend className={estilos.titulo}>Tamanho {indice + 1}</legend>
      <div className={estilos.topo}>
        <Campo
          label="Tamanho"
          value={variacao.nome_tamanho}
          erro={erros.nome_tamanho}
          dica="Ex.: 200 ml, 1 litro, Pacote com 50"
          maxLength={MAX_NOME_TAMANHO}
          autoComplete="off"
          onChange={(e) => onMudar('nome_tamanho', e.target.value)}
        />
        <div className={estilos.controles}>
          <ControlesOrdem
            id={variacao.chave}
            nome={nome}
            primeira={indice === 0}
            ultima={indice === total - 1}
            ocupado={ocupado}
            onMover={onMover}
          />
          <Botao
            variante="texto"
            className={estilos.remover}
            aria-label={`Remover ${nome}`}
            onClick={onRemover}
          >
            Remover
          </Botao>
        </div>
      </div>

      <div className={estilos.formas}>
        <div className={estilos.forma}>
          <label className={estilos.opcao}>
            <input
              type="checkbox"
              checked={variacao.vende_unidade}
              aria-invalid={erros.forma ? true : undefined}
              onChange={(e) => onMudar('vende_unidade', e.target.checked)}
            />
            Vende por unidade
          </label>
          {variacao.vende_unidade && (
            <CampoPreco
              label="Preço da unidade"
              valor={variacao.preco_unidade_centavos}
              erro={erros.preco_unidade_centavos}
              onChange={(centavos) => onMudar('preco_unidade_centavos', centavos)}
            />
          )}
        </div>

        <div className={estilos.forma}>
          <label className={estilos.opcao}>
            <input
              type="checkbox"
              checked={variacao.vende_fardo}
              onChange={(e) => onMudar('vende_fardo', e.target.checked)}
            />
            Vende por fardo
          </label>
          {variacao.vende_fardo && (
            <>
              <Campo
                label="Quantidade por fardo"
                value={variacao.qtd_por_fardo}
                erro={erros.qtd_por_fardo}
                inputMode="numeric"
                autoComplete="off"
                placeholder="Ex.: 1000"
                onChange={(e) => onMudar('qtd_por_fardo', e.target.value.replace(SO_DIGITOS, ''))}
              />
              <CampoPreco
                label="Preço do fardo"
                valor={variacao.preco_fardo_centavos}
                erro={erros.preco_fardo_centavos}
                onChange={(centavos) => onMudar('preco_fardo_centavos', centavos)}
              />
              {fardo && <p className={estilos.resumo}>{fardo.texto}</p>}
              {fardo && !fardo.maisBarato && (
                <p className={estilos.alerta} role="status">
                  Atenção: por unidade, o fardo não está mais barato que a unidade avulsa (
                  {fardo.unidade}). Confira os preços.
                </p>
              )}
            </>
          )}
        </div>
      </div>
      {erros.forma && (
        <p className={estilos.erro} role="alert">
          {erros.forma}
        </p>
      )}
    </fieldset>
  );
}
