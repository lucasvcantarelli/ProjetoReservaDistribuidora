import { useState } from 'react';
import { useToast } from '../../shared/hooks/useToast.js';
import { ErroApi } from '../../shared/services/api.js';
import { configService } from '../services/configService.js';
import {
  MSG_IMAGEM_GRANDE_DEMAIS,
  MSG_IMAGEM_ILEGIVEL,
  MSG_NAO_E_IMAGEM,
  comprimirImagem,
} from '../utils/comprimirImagem.js';
import { LADO_MAXIMO_LOGO } from '../utils/configForm.js';
import { useMarcaEmpresa } from './useMarcaEmpresa.js';
import { useSessaoExpirada } from './useSessaoExpirada.js';

const ROTA_CONFIGURACOES = '/configuracoes';
const MSG_ENVIADA = 'Logo atualizada.';
const MENSAGENS_CONHECIDAS = [MSG_NAO_E_IMAGEM, MSG_IMAGEM_ILEGIVEL, MSG_IMAGEM_GRANDE_DEMAIS];
const MSG_ERRO_INESPERADO = 'Não foi possível enviar a logo. Tente de novo.';

// Só mostra a mensagem da API ou da compressão; qualquer outro erro (rede, DOMException) vira texto genérico.
function mensagemSegura(erro) {
  const conhecido = erro instanceof ErroApi || MENSAGENS_CONHECIDAS.includes(erro?.message);
  return conhecido && erro.message ? erro.message : MSG_ERRO_INESPERADO;
}

// Logo da empresa: reduz no navegador (lado maior de 600 px) e envia na hora, sem esperar o "Salvar".
export function useLogoEmpresa(urlInicial) {
  const { mostrar } = useToast();
  const sessaoExpirou = useSessaoExpirada(ROTA_CONFIGURACOES);
  const { definirLogo } = useMarcaEmpresa();
  const [url, setUrl] = useState(urlInicial);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState('');

  async function enviar(arquivo) {
    setEnviando(true);
    setAviso('');
    try {
      const blob = await comprimirImagem(arquivo, { ladoMax: LADO_MAXIMO_LOGO });
      const config = await configService.enviarLogo(blob);
      setUrl(config.logo_url);
      definirLogo(config.logo_url);
      mostrar({ texto: MSG_ENVIADA });
    } catch (erro) {
      if (erro instanceof ErroApi && sessaoExpirou(erro)) return;
      setAviso(mensagemSegura(erro));
    } finally {
      setEnviando(false);
    }
  }

  return { url, enviando, aviso, enviar };
}
