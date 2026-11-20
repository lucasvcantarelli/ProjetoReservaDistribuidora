-- Reserva Distribuidora: esquema inicial.
-- O navegador só fala com Edge Functions (service_role). Todas as tabelas têm RLS ligado
-- e NENHUMA policy, e anon/authenticated não têm privilégio algum nelas.

create table categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text unique not null,
  ordem int default 0,
  ativo bool default true,
  criado_em timestamptz default now()
);

create table produtos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid references categorias on delete restrict,
  nome text not null,
  descricao text default '',
  ativo bool default true,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

create table produto_fotos (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos on delete cascade,
  caminho text not null,
  ordem int
);

create table produto_variacoes (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos on delete cascade,
  nome_tamanho text not null,
  ordem int,
  ativo bool default true,
  vende_unidade bool not null default false,
  preco_unidade_centavos int,
  vende_fardo bool not null default false,
  qtd_por_fardo int,
  preco_fardo_centavos int,
  check (
    (vende_unidade or vende_fardo)
    and (not vende_unidade or coalesce(preco_unidade_centavos, 0) > 0)
    and (not vende_fardo or (coalesce(preco_fardo_centavos, 0) > 0 and coalesce(qtd_por_fardo, 0) > 1))
  )
);

create table clientes (
  id uuid primary key references auth.users on delete cascade,
  tipo_pessoa text not null check (tipo_pessoa in ('PF', 'PJ')),
  nome text not null,
  cpf_cnpj text unique not null,
  razao_social text,
  telefone text,
  email text,
  cep text,
  rua text,
  numero text,
  complemento text default '',
  bairro text,
  cidade text,
  uf char(2),
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now(),
  check (tipo_pessoa = 'PF' or coalesce(trim(razao_social), '') <> '')
);

create table admins (
  user_id uuid primary key references auth.users on delete cascade
);

create table config_empresa (
  id int primary key default 1 check (id = 1),
  nome text default 'Reserva Distribuidora',
  cnpj text,
  whatsapp text,
  endereco text,
  logo_caminho text,
  rodape_mensagem text default ''
);

create table tentativas_login (
  id bigserial primary key,
  ip text,
  email text,
  sucesso bool,
  criado_em timestamptz default now()
);

create index tentativas_login_email_criado_em_idx on tentativas_login (email, criado_em);
create index tentativas_login_ip_criado_em_idx on tentativas_login (ip, criado_em);
create index produtos_categoria_id_idx on produtos (categoria_id);
create index produto_fotos_produto_id_idx on produto_fotos (produto_id);
create index produto_variacoes_produto_id_idx on produto_variacoes (produto_id);

-- Mantém atualizado_em sempre atual.
create function atualizar_atualizado_em() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger produtos_atualizado_em before update on produtos
  for each row execute function atualizar_atualizado_em();
create trigger clientes_atualizado_em before update on clientes
  for each row execute function atualizar_atualizado_em();

-- RLS ligado e nenhuma policy: a API pública (anon/authenticated) não enxerga nada.
alter table categorias enable row level security;
alter table produtos enable row level security;
alter table produto_fotos enable row level security;
alter table produto_variacoes enable row level security;
alter table clientes enable row level security;
alter table admins enable row level security;
alter table config_empresa enable row level security;
alter table tentativas_login enable row level security;

-- Defesa em profundidade: sem privilégios de tabela para anon/authenticated.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on function atualizar_atualizado_em() from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Bucket público para leitura das fotos; sem policies de escrita (só service_role grava).
insert into storage.buckets (id, name, public) values ('produtos', 'produtos', true);
