-- Limite de tentativas por ação: login, cadastro e recuperação de senha.
-- RLS e ausência de policies já valem para a tabela (ver migration do schema).
alter table tentativas_login
  add column acao text not null default 'login'
  check (acao in ('login', 'cadastro', 'recuperar'));

create index tentativas_login_acao_ip_criado_em_idx on tentativas_login (acao, ip, criado_em);
create index tentativas_login_acao_email_criado_em_idx on tentativas_login (acao, email, criado_em);
