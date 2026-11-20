const TIPO_RECUPERACAO = 'recovery';

// Lê o token do fragmento (#) do link do e-mail de recuperação de senha. Só vale link do tipo
// `recovery` com `access_token`; erro (ex.: link expirado) ou outro tipo de link devolve null.
export function lerTokenDeRecuperacao(hash) {
  const parametros = new URLSearchParams(String(hash ?? '').replace(/^#/, ''));
  const token = parametros.get('access_token');
  return token && parametros.get('type') === TIPO_RECUPERACAO ? token : null;
}
