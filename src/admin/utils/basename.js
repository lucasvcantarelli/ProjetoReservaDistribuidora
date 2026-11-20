// BASE_URL do Vite ('/painel-exemplo/') -> basename do roteador ('/painel-exemplo'); '/' vira sem basename.
export function basenameDe(baseUrl) {
  const semBarraFinal = String(baseUrl ?? '/').replace(/\/+$/, '');
  return semBarraFinal || undefined;
}
