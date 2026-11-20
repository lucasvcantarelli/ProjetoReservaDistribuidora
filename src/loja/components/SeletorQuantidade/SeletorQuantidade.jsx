import { useState } from 'react';
import { QUANTIDADE_MAXIMA, QUANTIDADE_MINIMA, limitarQuantidade } from '../../utils/produto.js';
import estilos from './SeletorQuantidade.module.css';

// Campo numérico com − / +. Enquanto digita, o texto pode ficar vazio; ao sair volta ao valor válido.
export default function SeletorQuantidade({ valor, onMudar, rotulo = 'Quantidade' }) {
  const [texto, setTexto] = useState(String(valor));
  if (texto !== '' && Number(texto) !== valor) setTexto(String(valor));

  function aoDigitar(evento) {
    const digitos = evento.target.value.replace(/\D/g, '');
    setTexto(digitos);
    if (digitos === '') return;
    onMudar(limitarQuantidade(Number(digitos)));
  }

  return (
    <div className={estilos.seletor}>
      <button
        type="button"
        className={estilos.botao}
        aria-label={`Diminuir ${rotulo.toLowerCase()}`}
        disabled={valor <= QUANTIDADE_MINIMA}
        onClick={() => onMudar(valor - 1)}
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        className={estilos.campo}
        aria-label={rotulo}
        value={texto}
        onChange={aoDigitar}
        onBlur={() => setTexto(String(valor))}
      />
      <button
        type="button"
        className={estilos.botao}
        aria-label={`Aumentar ${rotulo.toLowerCase()}`}
        disabled={valor >= QUANTIDADE_MAXIMA}
        onClick={() => onMudar(valor + 1)}
      >
        +
      </button>
    </div>
  );
}
