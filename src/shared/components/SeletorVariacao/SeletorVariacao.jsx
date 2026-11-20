import estilos from './SeletorVariacao.module.css';

// Grupo de opções em formato de chips (radios nativos: setas do teclado funcionam).
export default function SeletorVariacao({ legenda, nome, opcoes, valor, onMudar }) {
  return (
    <fieldset className={estilos.grupo}>
      <legend className={estilos.legenda}>{legenda}</legend>
      <div className={estilos.opcoes}>
        {opcoes.map((opcao) => (
          <label key={opcao.valor} className={estilos.opcao}>
            <input
              type="radio"
              name={nome}
              value={opcao.valor}
              checked={opcao.valor === valor}
              onChange={() => onMudar(opcao.valor)}
              className={estilos.radio}
            />
            <span className={estilos.chip}>
              <svg className={estilos.check} viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="m3.5 8.5 3 3 6-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {opcao.rotulo}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
