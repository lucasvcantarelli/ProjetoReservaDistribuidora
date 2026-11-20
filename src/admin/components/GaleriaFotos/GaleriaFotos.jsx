import { useEffect, useRef, useState } from 'react';
import Botao from '../../../shared/components/Botao';
import { MAX_FOTOS } from '../../../../supabase/functions/_shared/domain/produto.js';
import { STATUS_COMPRIMINDO, STATUS_ENVIANDO, STATUS_ERRO } from '../../hooks/useGaleriaFotos.js';
import ControlesOrdem from '../ControlesOrdem';
import estilos from './GaleriaFotos.module.css';

const TEXTO_STATUS = {
  [STATUS_COMPRIMINDO]: 'Comprimindo…',
  [STATUS_ENVIANDO]: 'Enviando…',
  [STATUS_ERRO]: 'Erro',
};

function CartaoEnvio({ envio, onTentarDeNovo, onDescartar }) {
  const comErro = envio.status === STATUS_ERRO;
  return (
    <li className={`${estilos.cartao} ${estilos.envio}`}>
      <p className={estilos.nomeArquivo}>{envio.nome}</p>
      <p
        className={comErro ? estilos.statusErro : estilos.status}
        role={comErro ? 'alert' : 'status'}
      >
        {TEXTO_STATUS[envio.status]}
      </p>
      {comErro && (
        <>
          <p className={estilos.mensagem}>{envio.erro}</p>
          <div className={estilos.acoes}>
            <Botao variante="secundario" onClick={onTentarDeNovo}>
              Tentar de novo
            </Botao>
            <Botao variante="texto" onClick={onDescartar}>
              Descartar
            </Botao>
          </div>
        </>
      )}
    </li>
  );
}

// Fotos do produto (até 10): enviar (seletor ou arrastar e soltar), ordem, remover e a "Capa".
// `galeria` vem de useGaleriaFotos. Sem produto salvo, só explica que é preciso salvar antes.
export default function GaleriaFotos({ galeria }) {
  const { fotos, envios, ocupado, movimento } = galeria;
  const [arrastando, setArrastando] = useState(false);
  const entradaRef = useRef(null);
  const gradeRef = useRef(null);

  useEffect(() => {
    if (!movimento) return;
    const seta = `[data-seta="${movimento.id}:${movimento.foco}"]`;
    gradeRef.current?.querySelector(seta)?.focus();
  }, [movimento]);

  if (!galeria.habilitada) {
    return (
      <p className={estilos.dica}>
        Primeiro salve o produto. Depois de salvar, você poderá adicionar as fotos aqui.
      </p>
    );
  }

  function receber(arquivos) {
    if (arquivos?.length) galeria.adicionar(arquivos);
    if (entradaRef.current) entradaRef.current.value = '';
  }

  function soltar(evento) {
    evento.preventDefault();
    setArrastando(false);
    receber(evento.dataTransfer.files);
  }

  return (
    <div className={estilos.galeria}>
      <label
        className={`${estilos.zona} ${arrastando ? estilos.arrastando : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={soltar}
      >
        <input
          ref={entradaRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => receber(e.target.files)}
        />
        <strong>Toque aqui para escolher as fotos</strong>
        <span>ou arraste as imagens para cá. Elas são reduzidas automaticamente.</span>
      </label>
      <p className={estilos.contagem}>
        {fotos.length} de {MAX_FOTOS} fotos. A primeira é a capa, que aparece na loja.
      </p>
      {galeria.aviso && (
        <p className={estilos.aviso} role="alert">
          {galeria.aviso}
        </p>
      )}
      <ul ref={gradeRef} className={estilos.grade}>
        {fotos.map((foto, indice) => (
          <li key={foto.id} className={estilos.cartao}>
            <div className={estilos.moldura}>
              <img className={estilos.imagem} src={foto.url} alt={`Foto ${indice + 1}`} />
              {indice === 0 && <span className={estilos.capa}>Capa</span>}
            </div>
            <div className={estilos.acoes}>
              <ControlesOrdem
                id={foto.id}
                nome={`foto ${indice + 1}`}
                primeira={indice === 0}
                ultima={indice === fotos.length - 1}
                ocupado={ocupado}
                onMover={(delta) => galeria.mover(foto, delta)}
              />
              <Botao
                variante="texto"
                className={estilos.remover}
                disabled={ocupado}
                aria-label={`Remover foto ${indice + 1}`}
                onClick={() => galeria.remover(foto)}
              >
                Remover
              </Botao>
            </div>
          </li>
        ))}
        {envios.map((envio) => (
          <CartaoEnvio
            key={envio.chave}
            envio={envio}
            onTentarDeNovo={() => galeria.tentarDeNovo(envio.chave)}
            onDescartar={() => galeria.descartar(envio.chave)}
          />
        ))}
      </ul>
      <p role="status" className="sr-only">
        {movimento?.anuncio}
      </p>
    </div>
  );
}
