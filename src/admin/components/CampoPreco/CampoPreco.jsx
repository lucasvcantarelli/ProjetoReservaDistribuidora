import { useId, useState } from 'react';
import { formatarReais, reaisParaCentavos } from '../../../shared/utils/formatar.js';
import estilos from './CampoPreco.module.css';

const MSG_PRECO_INVALIDO = 'Informe um preço válido.';
const PREFIXO_REAIS = 'R$ ';

// "R$ 1.234,50" -> "1.234,50" (o "R$" fica fora do campo, como prefixo visual).
function textoDeCentavos(centavos) {
  return centavos === null || centavos === undefined
    ? ''
    : formatarReais(centavos).replace(PREFIXO_REAIS, '');
}

// Campo de preço: a pessoa digita em reais ("10", "10,5", "1.234,56") e o formulário recebe centavos
// inteiros (ou null se estiver vazio/inválido). Formata ao sair do campo.
export default function CampoPreco({ label, valor, onChange, erro, dica, id, ...resto }) {
  const idGerado = useId();
  const idCampo = id ?? idGerado;
  const [texto, setTexto] = useState(() => textoDeCentavos(valor));
  const [tocado, setTocado] = useState(false);

  const preenchido = texto.trim() !== '';
  const centavos = preenchido ? reaisParaCentavos(texto) : null;
  const invalido = preenchido && centavos === null;
  const mensagem = (invalido && tocado ? MSG_PRECO_INVALIDO : null) ?? erro;
  const idMensagem = `${idCampo}-erro`;
  const idDica = `${idCampo}-dica`;
  const descricoes = [dica && idDica, mensagem && idMensagem].filter(Boolean).join(' ');

  function digitar(evento) {
    const novo = evento.target.value;
    setTexto(novo);
    onChange(novo.trim() === '' ? null : reaisParaCentavos(novo));
  }

  function sair() {
    setTocado(true);
    if (centavos !== null) setTexto(textoDeCentavos(centavos));
  }

  return (
    <div className={estilos.campo}>
      <label htmlFor={idCampo} className={estilos.label}>
        {label}
      </label>
      <div className={`${estilos.entrada} ${mensagem ? estilos.invalido : ''}`}>
        <span className={estilos.prefixo} aria-hidden="true">
          R$
        </span>
        <input
          id={idCampo}
          className={estilos.controle}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          value={texto}
          aria-invalid={mensagem ? true : undefined}
          aria-describedby={descricoes || undefined}
          onChange={digitar}
          onBlur={sair}
          {...resto}
        />
      </div>
      {dica && (
        <p id={idDica} className={estilos.dica}>
          {dica}
        </p>
      )}
      {mensagem && (
        <p id={idMensagem} className={estilos.erro}>
          {mensagem}
        </p>
      )}
    </div>
  );
}
