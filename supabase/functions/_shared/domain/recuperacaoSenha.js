// Verifica se um access token veio de um link de recuperação de senha. Módulo puro.

// O GoTrue grava 'otp' no `amr` da sessão aberta pelo link de recuperação (confirmado no Supabase
// local: link do e-mail e `/verify` tipo recovery); 'recovery' é aceito por compatibilidade.
// 'password' (login comum) e demais métodos ficam de fora.
const METODOS_RECUPERACAO = ['otp', 'recovery'];
const PARTES_JWT = 3;

function decodificarBase64Url(texto) {
  const base64 = texto.replace(/-/g, '+').replace(/_/g, '/');
  const preenchido = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const bytes = Uint8Array.from(atob(preenchido), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function lerPayload(token) {
  try {
    const partes = token.split('.');
    if (partes.length !== PARTES_JWT) return null;
    const payload = JSON.parse(decodificarBase64Url(partes[1]));
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
}

/**
 * True se o JWT tem uma entrada `amr` de link de recuperação (`otp` ou `recovery`; sessão criada
 * pelo link de "esqueci minha senha"). A assinatura NÃO é conferida aqui: o token já foi validado pelo
 * `auth.getUser`; isto só olha como a sessão foi iniciada.
 *
 * @param {string} token Access token (JWT).
 */
export function tokenDeRecuperacao(token) {
  if (typeof token !== 'string') return false;
  const amr = lerPayload(token)?.amr;
  return Array.isArray(amr) && amr.some((a) => METODOS_RECUPERACAO.includes(a?.method));
}
