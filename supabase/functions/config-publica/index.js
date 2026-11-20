import { db, urlPublica } from '../_shared/infra/db.js';
import { servir } from '../_shared/infra/http.js';

servir(async () => {
  const { data, error } = await db()
    .from('config_empresa')
    .select('nome, cnpj, logo_caminho, whatsapp, endereco, email_privacidade')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return {
    nome: data?.nome ?? 'Reserva Distribuidora',
    logo_url: urlPublica(data?.logo_caminho),
    cnpj: data?.cnpj ?? null,
    whatsapp: data?.whatsapp ?? null,
    endereco: data?.endereco ?? null,
    email_privacidade: data?.email_privacidade ?? null,
  };
});
