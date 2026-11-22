import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAvisoSaidaSemSalvar } from '../../shared/hooks/useAvisoSaidaSemSalvar.js';
import { useConfirm } from '../../shared/hooks/useConfirm.js';
import { useEnderecoPorCep } from '../../shared/hooks/useEnderecoPorCep.js';
import { useFormulario } from '../../shared/hooks/useFormulario.js';
import { useToast } from '../../shared/hooks/useToast.js';
import { ErroApi } from '../../shared/services/api.js';
import { formatarCep, formatarTelefone, mascararDocumento } from '../../shared/utils/formatar.js';
import { clientesService } from '../services/clientesService.js';
import {
  clienteParaFormulario,
  instantaneoCliente,
  validarClienteForm,
} from '../utils/clienteForm.js';
import { nomePrincipalCliente } from '../utils/clienteNome.js';
import { useSessaoExpirada } from './useSessaoExpirada.js';

const ROTA_CLIENTES = '/clientes';
const TIPO_COLAGEM = 'insertFromPaste';
const MSG_CONFIRA = 'Confira os campos destacados em vermelho.';
const MSG_CADASTRADO = 'Cliente cadastrado.';
const MSG_ATUALIZADO = 'Cliente atualizado.';
const MSG_EXCLUIDO = 'Cliente excluído.';

// Orquestra a ficha do cliente: valores, validação, gravação (cadastrar/atualizar), exclusão e aviso
// de alterações não salvas. `clienteInicial`: resposta de `obter`; sem ele, é um cadastro novo.
export function useClienteForm(clienteInicial) {
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { confirmar } = useConfirm();
  const sessaoExpirou = useSessaoExpirada(
    clienteInicial ? `${ROTA_CLIENTES}/${clienteInicial.id}` : `${ROTA_CLIENTES}/novo`,
  );
  const [cliente, setCliente] = useState(clienteInicial ?? null);
  const [inicial, setInicial] = useState(() => clienteParaFormulario(clienteInicial));
  const formulario = useFormulario(inicial);
  const { valores, mudar, definirValores, setErros, setAviso, submeter } = formulario;
  const sujo = instantaneoCliente(valores) !== instantaneoCliente(inicial);
  const { liberarSaida } = useAvisoSaidaSemSalvar(sujo);
  const juridica = valores.tipo_pessoa === 'PJ';
  const cep = useEnderecoPorCep(mudar);

  // Trocar o tipo troca o documento (CPF e CNPJ não se aproveitam); voltar ao tipo original restaura.
  function mudarTipo(tipo) {
    mudar('tipo_pessoa', tipo);
    mudar('cpf_cnpj', tipo === inicial.tipo_pessoa ? inicial.cpf_cnpj : '');
  }

  const mudarDocumento = (texto) =>
    mudar('cpf_cnpj', mascararDocumento(texto, valores.tipo_pessoa));
  const mudarCep = (texto) => cep.aoMudarCep(formatarCep(texto));
  const mudarTelefone = (evento) => {
    const colado = evento.nativeEvent?.inputType === TIPO_COLAGEM;
    mudar('telefone', formatarTelefone(evento.target.value, { colado }));
  };

  async function gravar(dados) {
    try {
      return cliente
        ? await clientesService.editar(cliente.id, dados)
        : await clientesService.criar(dados);
    } catch (erro) {
      if (!(erro instanceof ErroApi) || sessaoExpirou(erro)) throw erro;
      setErros(erro.campos ?? {});
      setAviso(erro.message);
      return undefined;
    }
  }

  async function salvar(evento) {
    evento.preventDefault();
    const validacao = validarClienteForm(valores);
    if (!validacao.ok) {
      setErros(validacao.campos);
      setAviso(MSG_CONFIRA);
      return;
    }
    setErros({});
    const salvo = await submeter(() => gravar(validacao.dados));
    if (!salvo) return;
    if (!cliente) {
      liberarSaida();
      mostrar({ texto: MSG_CADASTRADO });
      navigate(ROTA_CLIENTES);
      return;
    }
    const novoInicial = clienteParaFormulario(salvo);
    setCliente(salvo);
    setInicial(novoInicial);
    definirValores(novoInicial);
    mostrar({ texto: MSG_ATUALIZADO });
  }

  async function removerCliente() {
    try {
      await clientesService.excluir(cliente.id);
      return true;
    } catch (erro) {
      if (!(erro instanceof ErroApi) || sessaoExpirou(erro)) throw erro;
      mostrar({ tipo: 'erro', texto: erro.message });
      return false;
    }
  }

  async function excluir() {
    const confirmado = await confirmar({
      titulo: `Excluir ${nomePrincipalCliente(cliente)}?`,
      texto: 'Essa ação não pode ser desfeita.',
      textoConfirmar: 'Excluir',
      variante: 'perigo',
    });
    if (!confirmado || !(await submeter(removerCliente))) return;
    liberarSaida();
    mostrar({ texto: MSG_EXCLUIDO });
    navigate(ROTA_CLIENTES);
  }

  return {
    ...formulario,
    existente: !!cliente,
    juridica,
    sujo,
    mudarTipo,
    mudarDocumento,
    mudarCep,
    statusCep: cep.status,
    mudarTelefone,
    salvar,
    excluir,
    cancelar: () => navigate(ROTA_CLIENTES),
  };
}
