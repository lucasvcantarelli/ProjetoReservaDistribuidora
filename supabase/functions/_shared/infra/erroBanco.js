import { falhar } from './http.js';
import { traduzirErroBanco } from '../domain/erroBanco.js';

// Lança o erro do supabase-js: violações conhecidas viram 400 em PT-BR; o resto vira 500 genérico.
export function lancar(error) {
  if (!error) return;
  const traduzido = traduzirErroBanco(error);
  if (traduzido) falhar(traduzido.status, traduzido.erro);
  throw new Error(error.message);
}
