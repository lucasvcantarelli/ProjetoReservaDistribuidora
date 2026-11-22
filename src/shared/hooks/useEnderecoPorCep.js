import { useCallback, useRef, useState } from 'react';
import { TAMANHO_CEP } from '../../../supabase/functions/_shared/domain/cadastro.js';
import { cepService } from '../services/cepService.js';
import { somenteDigitos } from '../utils/formatar.js';

// Ao digitar um CEP completo, preenche rua, bairro, cidade e UF (campos continuam editáveis).
// Só reage à digitação: dados já carregados (lembrados ou de uma ficha) nunca são sobrescritos.
// status: 'ocioso' | 'buscando' | 'nao-encontrado'.

// Texto curto exibido embaixo do campo CEP para cada status.
export const DICA_CEP = {
  ocioso: undefined,
  buscando: 'Buscando endereço…',
  'nao-encontrado': 'Não conseguimos buscar o endereço desse CEP. Preencha abaixo.',
};

export function useEnderecoPorCep(mudar) {
  const [status, setStatus] = useState('ocioso');
  const ultimo = useRef('');

  const aoMudarCep = useCallback(
    async (texto) => {
      mudar('cep', texto);
      const digitos = somenteDigitos(texto);
      ultimo.current = digitos;
      if (digitos.length !== TAMANHO_CEP) {
        setStatus('ocioso');
        return;
      }
      setStatus('buscando');
      const endereco = await cepService.buscar(digitos);
      if (ultimo.current !== digitos) return; // o CEP mudou enquanto esperava
      if (!endereco) {
        setStatus('nao-encontrado');
        return;
      }
      // CEP de cidade inteira vem sem rua e bairro: mantém o que já foi digitado.
      if (endereco.rua) mudar('rua', endereco.rua);
      if (endereco.bairro) mudar('bairro', endereco.bairro);
      mudar('cidade', endereco.cidade);
      mudar('uf', endereco.uf);
      setStatus('ocioso');
    },
    [mudar],
  );

  return { aoMudarCep, status };
}
