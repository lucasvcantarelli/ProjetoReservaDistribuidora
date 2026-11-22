import Campo from '../Campo';
import { formatarCep, formatarTelefone } from '../../utils/formatar.js';
import { DICA_CEP } from '../../hooks/useEnderecoPorCep.js';
import { TAMANHO_MAXIMO, UFS } from '../../../../supabase/functions/_shared/domain/cadastro.js';
import estilos from './CamposCliente.module.css';

const TIPO_COLAGEM = 'insertFromPaste';
const MASCARAS = { telefone: formatarTelefone, cep: formatarCep };

// Campos de contato e endereço, iguais no cadastro, em "Minha conta" e na edição pelo admin.
// A razão social (empresa) fica a cargo de quem usa o componente. `onMudarCep`/`statusCep` (opcionais)
// vêm de useEnderecoPorCep: o CEP digitado preenche o endereço.
export default function CamposCliente({
  valores,
  erros,
  onMudar,
  juridica,
  onMudarCep,
  statusCep,
}) {
  function propsDo(nome, label, extras = {}) {
    const mascara = MASCARAS[nome];
    return {
      name: nome,
      label,
      value: valores[nome] ?? '',
      erro: erros[nome],
      maxLength: TAMANHO_MAXIMO[nome],
      onChange: (evento) => {
        const { value } = evento.target;
        const colado = evento.nativeEvent?.inputType === TIPO_COLAGEM;
        const texto = mascara ? mascara(value, { colado }) : value;
        if (nome === 'cep' && onMudarCep) onMudarCep(texto);
        else onMudar(nome, texto);
      },
      ...extras,
    };
  }

  return (
    <>
      <Campo
        {...propsDo('nome', juridica ? 'Nome do responsável' : 'Nome', { autoComplete: 'name' })}
      />
      <Campo
        {...propsDo('telefone', 'Telefone com DDD', {
          type: 'tel',
          inputMode: 'tel',
          autoComplete: 'tel-national',
        })}
      />
      <div className={estilos.linha}>
        <Campo
          {...propsDo('cep', 'CEP', {
            inputMode: 'numeric',
            autoComplete: 'postal-code',
            dica: DICA_CEP[statusCep ?? 'ocioso'],
          })}
        />
        <Campo {...propsDo('uf', 'UF', { como: 'select', autoComplete: 'address-level1' })}>
          <option value="">Selecione</option>
          {UFS.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </Campo>
      </div>
      <Campo {...propsDo('rua', 'Rua', { autoComplete: 'address-line1' })} />
      <div className={estilos.linha}>
        <Campo {...propsDo('numero', 'Número')} />
        <Campo {...propsDo('complemento', 'Complemento (opcional)')} />
      </div>
      <div className={estilos.linha}>
        <Campo {...propsDo('bairro', 'Bairro')} />
        <Campo {...propsDo('cidade', 'Cidade', { autoComplete: 'address-level2' })} />
      </div>
    </>
  );
}
