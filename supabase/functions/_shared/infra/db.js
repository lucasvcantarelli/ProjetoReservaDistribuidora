import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

let cliente = null;

// Cliente com service role (ignora RLS). Só deve ser usado dentro das Edge Functions.
export function db() {
  if (!cliente) {
    cliente = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return cliente;
}

// Cliente NOVO a cada chamada, com a anon key. Use-o para tudo que cria/troca sessão
// (signInWithPassword, refreshSession, resetPasswordForEmail): nunca no cliente memoizado de db(),
// senão o JWT de service role seria substituído pelo do usuário.
export function clienteDescartavel() {
  return createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// URL pública de um arquivo do bucket `produtos`. Em produção SUPABASE_URL já é pública;
// localmente (Docker) defina PUBLIC_SUPABASE_URL para o endereço acessível pelo navegador.
export function urlPublica(caminho) {
  if (!caminho) return null;
  const base = Deno.env.get('PUBLIC_SUPABASE_URL') || Deno.env.get('SUPABASE_URL');
  return `${base}/storage/v1/object/public/produtos/${caminho}`;
}
