-- Pedido sem conta: `clientes` vira o cadastro interno do admin, sem vínculo com auth.users.
-- Os dados do cliente no pedido só vão na mensagem do WhatsApp; nada disso é salvo no servidor.

-- 1) Solta o vínculo com o Auth ANTES de apagar usuários (senão o ON DELETE CASCADE apagaria
--    as fichas) e passa a gerar o id no próprio banco.
alter table clientes drop constraint clientes_id_fkey;
alter table clientes alter column id set default gen_random_uuid();

-- 2) Contas de cliente deixam de existir. Só mexe em quem não é admin; num banco de produção
--    vazio (sem clientes cadastrados) não apaga nada. Dado local/dev.
delete from auth.users where id not in (select user_id from public.admins);

-- 3) Ficha do cliente: CPF/CNPJ opcional (vazio = NULL; o unique aceita vários NULL).
alter table clientes alter column cpf_cnpj drop not null;
alter table clientes add constraint clientes_cpf_cnpj_formato
  check (cpf_cnpj is null or cpf_cnpj ~ '^([0-9]{11}|[0-9]{14})$');
alter table clientes add column nome_fantasia text;
alter table clientes add column observacoes text not null default '';

-- 4) Política de privacidade: e-mail de contato do titular (LGPD).
alter table config_empresa add column email_privacidade text;

-- 5) Limite de pedidos por IP: nova ação aceita em tentativas_login.
alter table tentativas_login drop constraint tentativas_login_acao_check;
alter table tentativas_login add constraint tentativas_login_acao_check
  check (acao in ('login', 'cadastro', 'recuperar', 'pedido'));

-- RLS continua ligado e sem policies; reafirma os privilégios (nenhum objeto novo foi criado).
alter table clientes enable row level security;
alter table config_empresa enable row level security;
alter table tentativas_login enable row level security;
revoke all on all tables in schema public from anon, authenticated;
