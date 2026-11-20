import { useFormulario } from '../../shared/hooks/useFormulario.js';
import { destinoSeguro } from '../../shared/utils/redirecionamento.js';
import { adminAuthService } from '../services/adminAuthService.js';
import { useSessaoAdmin } from './useSessaoAdmin.js';

export const DESTINO_APOS_LOGIN = '/categorias';

// Destino pós-login: o `voltar` seguro, ou a página inicial do painel.
export function destinoDoPainel(voltar) {
  const destino = destinoSeguro(voltar);
  return destino === '/' ? DESTINO_APOS_LOGIN : destino;
}

export function useEntrar() {
  const { iniciar } = useSessaoAdmin();
  const formulario = useFormulario({ email: '', senha: '' });
  const { valores, submeter } = formulario;

  async function entrar(evento) {
    evento.preventDefault();
    const dados = await submeter(() =>
      adminAuthService.entrar({ email: valores.email.trim(), senha: valores.senha }),
    );
    if (dados) iniciar(dados); // a tela de login percebe a sessão e segue para o destino
  }

  return { ...formulario, entrar };
}
