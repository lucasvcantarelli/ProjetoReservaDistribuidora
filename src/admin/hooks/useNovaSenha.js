import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { validarSenha } from '../../../supabase/functions/_shared/domain/cadastro.js';
import { useFormulario } from '../../shared/hooks/useFormulario.js';
import { useToast } from '../../shared/hooks/useToast.js';
import { adminAuthService } from '../services/adminAuthService.js';
import { lerTokenDeRecuperacao } from '../utils/recuperacaoSenha.js';

const MSG_SUCESSO = 'Senha alterada. Entre com a nova senha.';
const MSG_NAO_CONFERE = 'As senhas não conferem.';

// Tira o token da barra de endereço (histórico, "compartilhar", Referer); mantém o estado do roteador.
function limparFragmento() {
  const { pathname, search } = window.location;
  window.history.replaceState(window.history.state, '', pathname + search);
}

export function useNovaSenha() {
  const navigate = useNavigate();
  const { mostrar } = useToast();
  // O token fica só na memória deste componente (nunca em módulo, storage ou URL).
  const [token] = useState(() => lerTokenDeRecuperacao(window.location.hash));
  const formulario = useFormulario({ senha: '', confirmar: '' });
  const { valores, setErros, submeter } = formulario;

  useEffect(() => {
    if (window.location.hash) limparFragmento();
  }, []);

  async function enviar(evento) {
    evento.preventDefault();
    const { erro } = validarSenha(valores.senha);
    if (erro) return setErros({ senha: erro });
    if (valores.senha !== valores.confirmar) return setErros({ confirmar: MSG_NAO_CONFERE });

    const sucesso = await submeter(async () => {
      await adminAuthService.definirNovaSenha({ accessToken: token, senha: valores.senha });
      return true;
    });
    if (!sucesso) return undefined;
    mostrar({ texto: MSG_SUCESSO });
    return navigate('/entrar', { replace: true });
  }

  return { ...formulario, linkValido: Boolean(token), enviar };
}
