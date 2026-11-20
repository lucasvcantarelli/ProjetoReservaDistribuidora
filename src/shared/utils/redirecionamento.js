const DESTINO_PADRAO = '/';

const CODIGO_ULTIMO_CONTROLE = 0x1f;
const CODIGO_DELETE = 0x7f;
const BARRA_INVERTIDA = '\\';

function temCaractereProibido(texto) {
  return [...texto].some((c) => {
    const codigo = c.charCodeAt(0);
    return codigo <= CODIGO_ULTIMO_CONTROLE || codigo === CODIGO_DELETE || c === BARRA_INVERTIDA;
  });
}

// Só aceita caminho relativo do próprio app. '//host', barra invertida e caracteres de controle
// (o navegador ignora tab e quebra de linha: "/", tab, "/host" viraria "//host") abririam outro site.
export function destinoSeguro(voltar) {
  const valido =
    typeof voltar === 'string' &&
    voltar.startsWith('/') &&
    !voltar.startsWith('//') &&
    !temCaractereProibido(voltar);
  return valido ? voltar : DESTINO_PADRAO;
}

export function caminhoDeLogin(voltar) {
  return `/entrar?voltar=${encodeURIComponent(voltar).replace(/%2F/gi, '/')}`;
}
