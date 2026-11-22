// Endereço a partir do CEP (ViaCEP, gratuito e sem chave). Só o CEP sai do navegador.
// Qualquer falha devolve null: o endereço continua podendo ser digitado à mão.
import {
  TAMANHO_CEP,
  TAMANHO_MAXIMO,
  UFS,
} from '../../../supabase/functions/_shared/domain/cadastro.js';
import { somenteDigitos } from '../utils/formatar.js';

const URL_VIACEP = 'https://viacep.com.br/ws/';
const TEMPO_LIMITE_MS = 5000;

const cortar = (texto, campo) =>
  String(texto ?? '')
    .trim()
    .slice(0, TAMANHO_MAXIMO[campo]);

function paraEndereco(dados) {
  if (!dados || dados.erro) return null;
  const endereco = {
    rua: cortar(dados.logradouro, 'rua'),
    bairro: cortar(dados.bairro, 'bairro'),
    cidade: cortar(dados.localidade, 'cidade'),
    uf: String(dados.uf ?? '').toUpperCase(),
  };
  return endereco.cidade && UFS.includes(endereco.uf) ? endereco : null;
}

export const cepService = {
  // '01001-000' -> { rua, bairro, cidade, uf } ou null (incompleto, inexistente, fora do ar, lento).
  async buscar(cep) {
    const digitos = somenteDigitos(cep);
    if (digitos.length !== TAMANHO_CEP) return null;
    const controle = new AbortController();
    const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
    try {
      const resposta = await fetch(`${URL_VIACEP}${digitos}/json/`, { signal: controle.signal });
      if (!resposta.ok) return null;
      return paraEndereco(await resposta.json());
    } catch {
      return null;
    } finally {
      clearTimeout(relogio);
    }
  },
};
