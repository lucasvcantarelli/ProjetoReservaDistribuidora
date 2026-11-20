import Carregando from '../../../shared/components/Carregando';
import FalhaDeCarga from '../../components/FalhaDeCarga';
import FormularioConfiguracoes from '../../components/FormularioConfiguracoes';
import PaginaAdmin from '../../components/PaginaAdmin';
import { useConfiguracoes } from '../../hooks/useConfiguracoes.js';
import { useTituloDaPagina } from '../../hooks/useTituloDaPagina.js';

const TITULO = 'Configurações';

export default function Configuracoes() {
  useTituloDaPagina(TITULO);
  const carga = useConfiguracoes();

  function corpo() {
    if (carga.erro) return <FalhaDeCarga erro={carga.erro} onTentarDeNovo={carga.recarregar} />;
    if (carga.carregando) return <Carregando />;
    return <FormularioConfiguracoes config={carga.config} />;
  }

  return <PaginaAdmin titulo={TITULO}>{corpo()}</PaginaAdmin>;
}
