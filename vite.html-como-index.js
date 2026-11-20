import { rename } from 'node:fs/promises';
import { join } from 'node:path';

// Plugin compartilhado: depois da escrita, renomeia o HTML de entrada para `index.html`
// na pasta de saída, para que cada build (loja/admin) seja publicável como site independente.
export function htmlComoIndex(nomeEntrada) {
  let pastaSaida;
  return {
    name: 'html-como-index',
    apply: 'build',
    configResolved(config) {
      pastaSaida = join(config.root, config.build.outDir);
    },
    async writeBundle() {
      await rename(join(pastaSaida, nomeEntrada), join(pastaSaida, 'index.html'));
    },
  };
}
