import Campo from '../../../shared/components/Campo';
import CamposCliente from '../../../shared/components/CamposCliente';
import SeletorVariacao from '../../../shared/components/SeletorVariacao';
import { mascararDocumento } from '../../../shared/utils/formatar.js';
import { TAMANHO_MAXIMO } from '../../../../supabase/functions/_shared/domain/cadastro.js';
import estilos from './FormularioIdentificacao.module.css';

const OPCOES_TIPO = [
  { valor: 'PF', rotulo: 'Pessoa física' },
  { valor: 'PJ', rotulo: 'Empresa' },
];

// Identificação do cliente no pedido: vai só para a mensagem do WhatsApp. Pessoa física não informa
// documento; empresa informa razão social e CNPJ. `erros` vem com as chaves do formulário.
export default function FormularioIdentificacao({
  valores,
  erros,
  onMudar,
  onMudarTipo,
  onMudarCep,
  statusCep,
}) {
  const juridica = valores.tipo_pessoa === 'PJ';

  return (
    <fieldset className={estilos.grupo}>
      <legend className={estilos.titulo}>Seus dados</legend>
      <p className={estilos.texto}>Usados só para montar a mensagem do pedido no WhatsApp.</p>
      <SeletorVariacao
        legenda="Você compra como"
        nome="tipo_pessoa"
        opcoes={OPCOES_TIPO}
        valor={valores.tipo_pessoa}
        onMudar={onMudarTipo}
      />
      {juridica && (
        <>
          <Campo
            name="razao_social"
            label="Razão social"
            autoComplete="organization"
            maxLength={TAMANHO_MAXIMO.razao_social}
            value={valores.razao_social ?? ''}
            erro={erros.razao_social}
            onChange={(evento) => onMudar('razao_social', evento.target.value)}
          />
          <Campo
            name="cnpj"
            label="CNPJ"
            inputMode="numeric"
            value={valores.cnpj ?? ''}
            erro={erros.cnpj}
            onChange={(evento) => onMudar('cnpj', mascararDocumento(evento.target.value, 'PJ'))}
          />
        </>
      )}
      <CamposCliente
        valores={valores}
        erros={erros}
        onMudar={onMudar}
        juridica={juridica}
        onMudarCep={onMudarCep}
        statusCep={statusCep}
      />
    </fieldset>
  );
}
