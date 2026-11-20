import { useRef } from 'react';
import Aviso from '../../../shared/components/Aviso';
import Botao from '../../../shared/components/Botao';
import { useLogoEmpresa } from '../../hooks/useLogoEmpresa.js';
import estilos from './LogoEmpresa.module.css';

const TIPOS_ACEITOS = 'image/jpeg,image/png,image/webp';

// Logo atual (ou um espaço reservado) e o envio de uma nova imagem, que vale na hora.
export default function LogoEmpresa({ urlInicial }) {
  const logo = useLogoEmpresa(urlInicial);
  const entradaRef = useRef(null);

  function aoEscolher(evento) {
    const [arquivo] = evento.target.files;
    evento.target.value = '';
    if (arquivo) logo.enviar(arquivo);
  }

  return (
    <div className={estilos.logo}>
      <div className={estilos.moldura}>
        {logo.url ? (
          <img src={logo.url} alt="Logo atual da empresa" className={estilos.imagem} />
        ) : (
          <span className={estilos.vazia}>Sem logo</span>
        )}
      </div>
      <div className={estilos.controles}>
        <input
          ref={entradaRef}
          type="file"
          accept={TIPOS_ACEITOS}
          className="sr-only"
          aria-label="Escolher imagem da logo"
          tabIndex={-1}
          onChange={aoEscolher}
        />
        <Botao
          variante="secundario"
          carregando={logo.enviando}
          onClick={() => entradaRef.current.click()}
        >
          {logo.url ? 'Trocar logo' : 'Enviar logo'}
        </Botao>
        <p className={estilos.dica}>
          JPG, PNG ou WebP. A imagem é reduzida no seu aparelho e a logo é trocada na hora, sem
          precisar clicar em Salvar.
        </p>
        <Aviso>{logo.aviso}</Aviso>
      </div>
    </div>
  );
}
