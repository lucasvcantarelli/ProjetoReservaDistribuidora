-- Salva produto + variações numa única transação (o supabase-js não tem transações).
-- Chamada só pela Edge Function `admin-produtos` (service_role), depois da validação em JS.
--   p_produto:   { id?, categoria_id, nome, descricao, ativo }  (sem id = cria)
--   p_variacoes: [{ id?, nome_tamanho, ordem, ativo, vende_unidade, preco_unidade_centavos,
--                   vende_fardo, qtd_por_fardo, preco_fardo_centavos }]
-- Variações sem id são criadas; com id são atualizadas (o id precisa ser deste produto);
-- as que não vierem na lista são removidas.
create function public.admin_salvar_produto(p_produto jsonb, p_variacoes jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := nullif(p_produto ->> 'id', '')::uuid;
  v_var jsonb;
  v_var_id uuid;
begin
  if jsonb_typeof(p_variacoes) is distinct from 'array' then
    raise exception 'variacoes_invalidas' using errcode = '22023';
  end if;

  if v_id is null then
    insert into public.produtos (categoria_id, nome, descricao, ativo)
    values (
      (p_produto ->> 'categoria_id')::uuid,
      p_produto ->> 'nome',
      coalesce(p_produto ->> 'descricao', ''),
      coalesce((p_produto ->> 'ativo')::bool, true)
    )
    returning id into v_id;
  else
    update public.produtos
    set categoria_id = (p_produto ->> 'categoria_id')::uuid,
        nome = p_produto ->> 'nome',
        descricao = coalesce(p_produto ->> 'descricao', ''),
        ativo = coalesce((p_produto ->> 'ativo')::bool, true)
    where id = v_id;
    if not found then
      raise exception 'produto_inexistente' using errcode = 'P0002';
    end if;
  end if;

  -- Toda variação com id precisa pertencer a este produto.
  if exists (
    select 1
    from jsonb_array_elements(p_variacoes) e
    where nullif(e ->> 'id', '') is not null
      and not exists (
        select 1
        from public.produto_variacoes pv
        where pv.id = (e ->> 'id')::uuid and pv.produto_id = v_id
      )
  ) then
    raise exception 'variacao_invalida' using errcode = '22023';
  end if;

  delete from public.produto_variacoes pv
  where pv.produto_id = v_id
    and pv.id not in (
      select (e ->> 'id')::uuid
      from jsonb_array_elements(p_variacoes) e
      where nullif(e ->> 'id', '') is not null
    );

  for v_var in select value from jsonb_array_elements(p_variacoes) loop
    v_var_id := nullif(v_var ->> 'id', '')::uuid;
    if v_var_id is null then
      insert into public.produto_variacoes (
        produto_id, nome_tamanho, ordem, ativo, vende_unidade, preco_unidade_centavos,
        vende_fardo, qtd_por_fardo, preco_fardo_centavos
      ) values (
        v_id,
        v_var ->> 'nome_tamanho',
        (v_var ->> 'ordem')::int,
        coalesce((v_var ->> 'ativo')::bool, true),
        coalesce((v_var ->> 'vende_unidade')::bool, false),
        (v_var ->> 'preco_unidade_centavos')::int,
        coalesce((v_var ->> 'vende_fardo')::bool, false),
        (v_var ->> 'qtd_por_fardo')::int,
        (v_var ->> 'preco_fardo_centavos')::int
      );
    else
      update public.produto_variacoes
      set nome_tamanho = v_var ->> 'nome_tamanho',
          ordem = (v_var ->> 'ordem')::int,
          ativo = coalesce((v_var ->> 'ativo')::bool, true),
          vende_unidade = coalesce((v_var ->> 'vende_unidade')::bool, false),
          preco_unidade_centavos = (v_var ->> 'preco_unidade_centavos')::int,
          vende_fardo = coalesce((v_var ->> 'vende_fardo')::bool, false),
          qtd_por_fardo = (v_var ->> 'qtd_por_fardo')::int,
          preco_fardo_centavos = (v_var ->> 'preco_fardo_centavos')::int
      where id = v_var_id and produto_id = v_id;
    end if;
  end loop;

  return v_id;
end;
$$;

revoke all on function public.admin_salvar_produto(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.admin_salvar_produto(jsonb, jsonb) to service_role;
