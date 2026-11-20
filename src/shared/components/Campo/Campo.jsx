import { useId } from 'react';
import estilos from './Campo.module.css';

export default function Campo({
  label,
  como: Elemento = 'input',
  erro,
  dica,
  id,
  className = '',
  children,
  ...resto
}) {
  const idGerado = useId();
  const idCampo = id ?? idGerado;
  const idErro = `${idCampo}-erro`;
  const idDica = `${idCampo}-dica`;
  const descricoes = [dica && idDica, erro && idErro].filter(Boolean).join(' ');

  return (
    <div className={estilos.campo}>
      <label htmlFor={idCampo} className={estilos.label}>
        {label}
      </label>
      <Elemento
        id={idCampo}
        className={[estilos.controle, erro && estilos.invalido, className]
          .filter(Boolean)
          .join(' ')}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricoes || undefined}
        {...resto}
      >
        {children}
      </Elemento>
      {dica && (
        <p id={idDica} className={estilos.dica}>
          {dica}
        </p>
      )}
      {erro && (
        <p id={idErro} className={estilos.erro}>
          {erro}
        </p>
      )}
    </div>
  );
}
