import { useState } from 'react';
import { useAvisoSaidaSemSalvar } from '../../shared/hooks/useAvisoSaidaSemSalvar.js';
import { useFormulario } from '../../shared/hooks/useFormulario.js';
import { useToast } from '../../shared/hooks/useToast.js';
import { ErroApi } from '../../shared/services/api.js';
import { formatarTelefone, mascararDocumento } from '../../shared/utils/formatar.js';
import { configService } from '../services/configService.js';
import { configParaFormulario, instantaneoConfig, validarConfigForm } from '../utils/configForm.js';
import { useSessaoExpirada } from './useSessaoExpirada.js';

const ROTA_CONFIGURACOES = '/configuracoes';
const TIPO_COLAGEM = 'insertFromPaste';
const MSG_CONFIRA = 'Confira os campos destacados em vermelho.';
const MSG_SALVO = 'Configurações salvas.';

// Orquestra o formulário de configurações: valores, validação, gravação e aviso de alterações não
// salvas. `configInicial`: resposta de `obter`. O WhatsApp salvo (com DDI) fica em `whatsappSalvo`.
export function useFormularioConfiguracoes(configInicial) {
  const { mostrar } = useToast();
  const sessaoExpirou = useSessaoExpirada(ROTA_CONFIGURACOES);
  const [salvo, setSalvo] = useState(configInicial);
  const [inicial, setInicial] = useState(() => configParaFormulario(configInicial));
  const formulario = useFormulario(inicial);
  const { valores, mudar, definirValores, setErros, setAviso, submeter } = formulario;
  const sujo = instantaneoConfig(valores) !== instantaneoConfig(inicial);
  useAvisoSaidaSemSalvar(sujo);

  const mudarCnpj = (texto) => mudar('cnpj', mascararDocumento(texto, 'PJ'));
  // Colar "+55 81 99999-0000" descarta o 55 do começo (digitando, não).
  const mudarWhatsapp = (evento) => {
    const colado = evento.nativeEvent?.inputType === TIPO_COLAGEM;
    mudar('whatsapp', formatarTelefone(evento.target.value, { colado }));
  };

  async function gravar(dados) {
    try {
      return await configService.editar(dados);
    } catch (erro) {
      if (!(erro instanceof ErroApi) || sessaoExpirou(erro)) throw erro;
      setErros(erro.campos ?? {});
      setAviso(erro.message);
      return undefined;
    }
  }

  async function salvar(evento) {
    evento.preventDefault();
    const validacao = validarConfigForm(valores);
    if (!validacao.ok) {
      setErros(validacao.campos);
      setAviso(MSG_CONFIRA);
      return;
    }
    setErros({});
    const atualizado = await submeter(() => gravar(validacao.dados));
    if (!atualizado) return;
    const novoInicial = configParaFormulario(atualizado);
    setSalvo(atualizado);
    setInicial(novoInicial);
    definirValores(novoInicial);
    mostrar({ texto: MSG_SALVO });
  }

  return { ...formulario, whatsappSalvo: salvo.whatsapp, sujo, mudarCnpj, mudarWhatsapp, salvar };
}
