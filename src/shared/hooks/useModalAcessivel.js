import { useEffect, useRef } from 'react';

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const ATRIBUTO_SEMPRE_ATIVO = 'data-sempre-ativo';

function tornarFundoInerte(contorno) {
  const afetados = [...document.body.children].filter(
    (el) => el !== contorno && !el.hasAttribute(ATRIBUTO_SEMPRE_ATIVO) && !el.inert,
  );
  afetados.forEach((el) => el.setAttribute('inert', ''));
  return () => afetados.forEach((el) => el.removeAttribute('inert'));
}

function prenderFoco(evento, dialogo) {
  const itens = [...dialogo.querySelectorAll(FOCAVEIS)];
  if (itens.length === 0) {
    evento.preventDefault();
    return;
  }
  const primeiro = itens[0];
  const ultimo = itens[itens.length - 1];
  const ativo = document.activeElement;
  if (evento.shiftKey && (ativo === primeiro || ativo === dialogo)) {
    evento.preventDefault();
    ultimo.focus();
  } else if (!evento.shiftKey && ativo === ultimo) {
    evento.preventDefault();
    primeiro.focus();
  }
}

// Pilha de modais abertos: só o do topo reage a Esc/Tab.
const pilha = [];

// Foco inicial no diálogo, foco preso, Esc fecha, fundo inerte e foco devolvido ao fechar.
export function useModalAcessivel({ contornoRef, dialogoRef, onFechar }) {
  const onFecharRef = useRef(onFechar);

  useEffect(() => {
    onFecharRef.current = onFechar;
  });

  useEffect(() => {
    const dialogo = dialogoRef.current;
    const anterior = document.activeElement;
    const restaurarFundo = tornarFundoInerte(contornoRef.current);
    const marca = {};
    pilha.push(marca);
    (dialogo.querySelector(FOCAVEIS) ?? dialogo).focus();

    function aoTeclar(evento) {
      if (pilha[pilha.length - 1] !== marca) return;
      if (evento.key === 'Escape') onFecharRef.current();
      else if (evento.key === 'Tab') prenderFoco(evento, dialogo);
    }
    document.addEventListener('keydown', aoTeclar);

    return () => {
      document.removeEventListener('keydown', aoTeclar);
      pilha.splice(pilha.indexOf(marca), 1);
      restaurarFundo();
      anterior?.focus?.();
    };
  }, [contornoRef, dialogoRef]);
}
