import { useParams } from 'react-router-dom';
import Carregando from '../../../shared/components/Carregando';
import FalhaDeCarga from '../../components/FalhaDeCarga';
import FormularioCliente from '../../components/FormularioCliente';
import PaginaAdmin from '../../components/PaginaAdmin';
import { useClientePorId } from '../../hooks/useClientePorId.js';
import { useTituloDaPagina } from '../../hooks/useTituloDaPagina.js';

const SUBTITULO = 'Cadastro interno da empresa — não cria acesso ao site.';

// Novo cliente (/clientes/novo) ou ficha de um cliente (/clientes/:id): espera o cadastro chegar
// antes de mostrar o formulário.
export default function ClienteForm() {
  const { id } = useParams();
  const titulo = id ? 'Ficha do cliente' : 'Novo cliente';
  useTituloDaPagina(titulo);
  const carga = useClientePorId(id);

  function corpo() {
    if (carga.erro) return <FalhaDeCarga erro={carga.erro} onTentarDeNovo={carga.recarregar} />;
    if (carga.carregando) return <Carregando />;
    return <FormularioCliente key={id ?? 'novo'} cliente={id ? carga.cliente : null} />;
  }

  return (
    <PaginaAdmin titulo={titulo} subtitulo={SUBTITULO}>
      {corpo()}
    </PaginaAdmin>
  );
}
