import { useState } from 'react';
import { useFormulario } from '../../shared/hooks/useFormulario.js';
import { adminAuthService } from '../services/adminAuthService.js';

export function useEsqueciSenha() {
  const formulario = useFormulario({ email: '' });
  const { valores, submeter } = formulario;
  const [mensagem, setMensagem] = useState('');

  async function enviar(evento) {
    evento.preventDefault();
    const resposta = await submeter(() =>
      adminAuthService.recuperarSenha({ email: valores.email.trim() }),
    );
    if (resposta) setMensagem(resposta); // mensagem neutra do servidor, igual para qualquer e-mail
  }

  return { ...formulario, mensagem, enviar };
}
