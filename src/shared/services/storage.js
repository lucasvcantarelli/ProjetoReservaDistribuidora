// Única porta de acesso ao localStorage. Qualquer falha (modo privado, cota, JSON inválido) vira o valor padrão.
export const storage = {
  ler(chave, padrao = null) {
    try {
      const bruto = window.localStorage.getItem(chave);
      return bruto === null ? padrao : JSON.parse(bruto);
    } catch {
      return padrao;
    }
  },

  gravar(chave, valor) {
    try {
      window.localStorage.setItem(chave, JSON.stringify(valor));
      return true;
    } catch {
      return false;
    }
  },

  remover(chave) {
    try {
      window.localStorage.removeItem(chave);
    } catch {
      /* sem efeito para o usuário */
    }
  },
};
