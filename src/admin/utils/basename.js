// BASE_URL do Vite ('/painel-x7k2q/') -> basename do roteador ('/painel-x7k2q'); '/' vira sem basename.
export function basenameDe(baseUrl) {
  const semBarraFinal = String(baseUrl ?? '/').replace(/\/+$/, '');
  return semBarraFinal || undefined;
}
