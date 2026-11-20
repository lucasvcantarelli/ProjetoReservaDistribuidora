// Plugin só do servidor de desenvolvimento: qualquer navegação de página dentro do `base` (ex.: /produto/123)
// devolve o HTML de entrada, como o .htaccess faz em produção, para o React Router resolver a rota.
export function spaDev(nomeEntrada) {
  let base = '/';
  return {
    name: 'spa-dev',
    apply: 'serve',
    configResolved(config) {
      base = config.base.endsWith('/') ? config.base : `${config.base}/`;
    },
    configureServer(servidor) {
      servidor.middlewares.use((req, _res, next) => {
        const caminho = (req.url ?? '').split('?')[0];
        const ehPagina = req.method === 'GET' && req.headers.accept?.includes('text/html');
        const dentroDoBase = caminho.startsWith(base);
        if (ehPagina && dentroDoBase && !caminho.includes('.') && !caminho.includes('/@')) {
          req.url = `${base}${nomeEntrada}`;
        }
        next();
      });
    },
  };
}
