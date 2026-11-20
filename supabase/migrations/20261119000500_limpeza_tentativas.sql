-- Limpeza diária das tentativas de login/cadastro/recuperação (as janelas de limite são de no
-- máximo 60 minutos, então 1 dia sobra). Usa pg_cron, disponível no Supabase (inclusive no
-- plano gratuito) e no banco local. `cron.schedule` com o mesmo nome apenas atualiza o job.
create extension if not exists pg_cron;

select cron.schedule(
  'limpar-tentativas-login',
  '0 3 * * *',
  $$delete from public.tentativas_login where criado_em < now() - interval '1 day'$$
);
