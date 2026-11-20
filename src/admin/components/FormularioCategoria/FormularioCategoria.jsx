import Aviso from '../../../shared/components/Aviso';
import Botao from '../../../shared/components/Botao';
import Campo from '../../../shared/components/Campo';
import { useFocoNoPrimeiroErro } from '../../../shared/hooks/useFocoNoPrimeiroErro.js';
import { useFormularioCategoria } from '../../hooks/useFormularioCategoria.js';
import estilos from './FormularioCategoria.module.css';

const MAX_NOME = 80;

// Formulário de categoria dentro do Modal. Categoria nova entra sempre ativa; só a edição mostra o status.
export default function FormularioCategoria({ categoria, onSalvar, onFechar }) {
  const { valores, erros, aviso, enviando, mudar, salvar } = useFormularioCategoria({
    categoria,
    onSalvar,
    onFechar,
  });
  const formRef = useFocoNoPrimeiroErro(erros);

  return (
    <form onSubmit={salvar} noValidate ref={formRef} className={estilos.formulario}>
      <Aviso>{aviso}</Aviso>
      <Campo
        label="Nome"
        name="nome"
        value={valores.nome}
        erro={erros.nome}
        maxLength={MAX_NOME}
        autoComplete="off"
        onChange={(e) => mudar('nome', e.target.value)}
        required
      />
      {categoria && (
        <label className={estilos.opcao}>
          <input
            type="checkbox"
            checked={valores.ativo}
            onChange={(e) => mudar('ativo', e.target.checked)}
          />
          Categoria ativa (visível na loja)
        </label>
      )}
      <div className={estilos.acoes}>
        <Botao variante="secundario" onClick={onFechar}>
          Cancelar
        </Botao>
        <Botao type="submit" carregando={enviando}>
          Salvar
        </Botao>
      </div>
    </form>
  );
}
