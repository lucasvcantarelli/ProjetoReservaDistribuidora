import estilos from './PaginaFormulario.module.css';

// Moldura das telas de conta: título, texto de apoio, cartão central e links auxiliares embaixo.
// Com `onSubmit`, o cartão é o próprio <form> (e `formRef` aponta para ele).
export default function PaginaFormulario({
  titulo,
  subtitulo,
  larga = false,
  rodape,
  onSubmit,
  formRef,
  children,
}) {
  const Cartao = onSubmit ? 'form' : 'div';
  const propsForm = onSubmit ? { onSubmit, noValidate: true, ref: formRef } : {};
  return (
    <div className={`${estilos.pagina} ${larga ? estilos.larga : ''}`}>
      <h1 className={estilos.titulo}>{titulo}</h1>
      {subtitulo && <p className={estilos.subtitulo}>{subtitulo}</p>}
      <Cartao className={estilos.cartao} {...propsForm}>
        {children}
      </Cartao>
      {rodape && <p className={estilos.rodape}>{rodape}</p>}
    </div>
  );
}
