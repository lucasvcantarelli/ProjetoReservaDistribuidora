import Aviso from '../../../shared/components/Aviso';
import Botao from '../../../shared/components/Botao';
import Campo from '../../../shared/components/Campo';
import SeletorVariacao from '../../../shared/components/SeletorVariacao';
import { useFocoNoPrimeiroErro } from '../../../shared/hooks/useFocoNoPrimeiroErro.js';
import {
  TAMANHO_MAXIMO,
  TIPOS_PESSOA,
  UFS,
} from '../../../../supabase/functions/_shared/domain/cadastro.js';
import { useClienteForm } from '../../hooks/useClienteForm.js';
import { MAX_OBSERVACOES } from '../../utils/clienteForm.js';
import BarraAcoes from '../BarraAcoes';
import SecaoFormulario from '../SecaoFormulario';
import estilos from './FormularioCliente.module.css';

const ROTULOS_TIPO = { PF: 'Pessoa física', PJ: 'Empresa' };
const OPCOES_TIPO = TIPOS_PESSOA.map((valor) => ({ valor, rotulo: ROTULOS_TIPO[valor] }));

// Ficha de cadastro de um cliente da empresa (cadastro interno; não cria acesso ao site).
// `cliente`: resposta de `obter`; sem ele, é um cadastro novo.
export default function FormularioCliente({ cliente }) {
  const f = useClienteForm(cliente);
  const formRef = useFocoNoPrimeiroErro(f.erros);
  const { valores, erros, juridica } = f;

  const texto = (nome, label, extras = {}) => ({
    name: nome,
    label,
    value: valores[nome],
    erro: erros[nome],
    maxLength: TAMANHO_MAXIMO[nome],
    onChange: (e) => f.mudar(nome, e.target.value),
    ...extras,
  });

  return (
    <form onSubmit={f.salvar} noValidate ref={formRef} className={estilos.formulario}>
      <Aviso>{f.aviso}</Aviso>

      <SecaoFormulario numero="1" titulo={juridica ? 'Empresa' : 'Tipo de cadastro'}>
        <SeletorVariacao
          legenda="Tipo de cadastro"
          nome="tipo_pessoa"
          opcoes={OPCOES_TIPO}
          valor={valores.tipo_pessoa}
          onMudar={f.mudarTipo}
        />
        {juridica && (
          <>
            <Campo {...texto('razao_social', 'Razão social', { autoComplete: 'off' })} />
            <Campo
              {...texto('nome_fantasia', 'Nome fantasia (opcional)', { autoComplete: 'off' })}
            />
          </>
        )}
      </SecaoFormulario>

      <SecaoFormulario numero="2" titulo="Responsável">
        <Campo
          {...texto('nome', juridica ? 'Nome do responsável ou proprietário' : 'Nome do cliente', {
            autoComplete: 'off',
          })}
        />
      </SecaoFormulario>

      <SecaoFormulario numero="3" titulo="Documento">
        <Campo
          label={juridica ? 'CNPJ (opcional)' : 'CPF (opcional)'}
          name="cpf_cnpj"
          inputMode="numeric"
          autoComplete="off"
          value={valores.cpf_cnpj}
          erro={erros.cpf_cnpj}
          onChange={(e) => f.mudarDocumento(e.target.value)}
        />
      </SecaoFormulario>

      <SecaoFormulario numero="4" titulo="Contato">
        <div className={estilos.linha}>
          <Campo
            label="Telefone / WhatsApp (opcional)"
            name="telefone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            value={valores.telefone}
            erro={erros.telefone}
            onChange={f.mudarTelefone}
          />
          <Campo
            label="E-mail (opcional)"
            name="email"
            type="email"
            autoComplete="off"
            maxLength={TAMANHO_MAXIMO.email}
            value={valores.email}
            erro={erros.email}
            onChange={(e) => f.mudar('email', e.target.value)}
          />
        </div>
      </SecaoFormulario>

      <SecaoFormulario numero="5" titulo="Endereço (opcional)">
        <div className={estilos.linha}>
          <Campo
            label="CEP"
            name="cep"
            inputMode="numeric"
            autoComplete="off"
            value={valores.cep}
            erro={erros.cep}
            onChange={(e) => f.mudarCep(e.target.value)}
          />
          <Campo
            label="UF"
            name="uf"
            como="select"
            value={valores.uf}
            erro={erros.uf}
            onChange={(e) => f.mudar('uf', e.target.value)}
          >
            <option value="">Selecione</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </Campo>
        </div>
        <Campo {...texto('rua', 'Rua', { autoComplete: 'off' })} />
        <div className={estilos.linha}>
          <Campo {...texto('numero', 'Número', { autoComplete: 'off' })} />
          <Campo {...texto('complemento', 'Complemento', { autoComplete: 'off' })} />
        </div>
        <div className={estilos.linha}>
          <Campo {...texto('bairro', 'Bairro', { autoComplete: 'off' })} />
          <Campo {...texto('cidade', 'Cidade', { autoComplete: 'off' })} />
        </div>
      </SecaoFormulario>

      <SecaoFormulario numero="6" titulo="Observações">
        <Campo
          label="Observações (opcional)"
          name="observacoes"
          como="textarea"
          rows={4}
          maxLength={MAX_OBSERVACOES}
          value={valores.observacoes}
          erro={erros.observacoes}
          dica={`${valores.observacoes.length} de ${MAX_OBSERVACOES} caracteres`}
          onChange={(e) => f.mudar('observacoes', e.target.value)}
        />
      </SecaoFormulario>

      {f.existente && (
        <div className={estilos.zonaExclusao}>
          <Botao
            variante="texto"
            className={estilos.excluir}
            disabled={f.enviando}
            onClick={f.excluir}
          >
            Excluir cliente
          </Botao>
        </div>
      )}

      <BarraAcoes enviando={f.enviando} onCancelar={f.cancelar} />
    </form>
  );
}
