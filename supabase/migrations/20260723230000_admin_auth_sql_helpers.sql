-- Admin Auth helpers via Postgres to avoid Edge Function JWT forwarding issues
-- when calling /auth/v1/admin/* with asymmetric user tokens.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.admin_auth_can_manage()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.role(), '') = 'service_role' or public.is_admin();
$$;

create or replace function public.admin_auth_set_password(
  target_user_id uuid,
  new_password text
)
returns void
language plpgsql
security definer
set search_path = auth, extensions, public
as $$
begin
  if not (
    public.admin_auth_can_manage()
    or auth.uid() = target_user_id
  ) then
    raise exception 'No autorizado para cambiar contraseñas.';
  end if;

  if new_password is null or length(trim(new_password)) < 6 then
    raise exception 'La contraseña debe tener al menos 6 caracteres.';
  end if;

  update auth.users
  set
    encrypted_password = crypt(trim(new_password), gen_salt('bf')),
    updated_at = now()
  where id = target_user_id;

  if not found then
    raise exception 'Usuario de autenticacion no encontrado.';
  end if;

  delete from auth.sessions where user_id = target_user_id;
  delete from auth.refresh_tokens where user_id = target_user_id::text;
end;
$$;

create or replace function public.admin_auth_update_user(
  target_user_id uuid,
  new_email text default null,
  new_user_meta jsonb default null
)
returns void
language plpgsql
security definer
set search_path = auth, extensions, public
as $$
begin
  if not public.admin_auth_can_manage() then
    raise exception 'Solo administradores pueden actualizar usuarios.';
  end if;

  update auth.users
  set
    email = coalesce(nullif(trim(new_email), ''), email),
    email_confirmed_at = case
      when nullif(trim(new_email), '') is not null then coalesce(email_confirmed_at, now())
      else email_confirmed_at
    end,
    raw_user_meta_data = coalesce(new_user_meta, raw_user_meta_data),
    updated_at = now()
  where id = target_user_id;

  if not found then
    raise exception 'Usuario de autenticacion no encontrado.';
  end if;

  if nullif(trim(new_email), '') is not null then
    update auth.identities
    set
      identity_data = coalesce(identity_data, '{}'::jsonb)
        || jsonb_build_object(
          'email', lower(trim(new_email)),
          'email_verified', true,
          'sub', target_user_id::text
        ),
      updated_at = now()
    where user_id = target_user_id
      and provider = 'email';
  end if;
end;
$$;

create or replace function public.admin_auth_set_ban(
  target_user_id uuid,
  banned_until timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = auth, extensions, public
as $$
begin
  if not public.admin_auth_can_manage() then
    raise exception 'Solo administradores pueden banear usuarios.';
  end if;

  update auth.users
  set
    banned_until = admin_auth_set_ban.banned_until,
    updated_at = now()
  where id = target_user_id;

  if not found then
    raise exception 'Usuario de autenticacion no encontrado.';
  end if;

  if banned_until is not null then
    delete from auth.sessions where user_id = target_user_id;
    delete from auth.refresh_tokens where user_id = target_user_id::text;
  end if;
end;
$$;

create or replace function public.admin_auth_delete_user(
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = auth, extensions, public
as $$
begin
  if not public.admin_auth_can_manage() then
    raise exception 'Solo administradores pueden eliminar usuarios.';
  end if;

  delete from auth.identities where user_id = target_user_id;
  delete from auth.sessions where user_id = target_user_id;
  delete from auth.refresh_tokens where user_id = target_user_id::text;
  delete from auth.users where id = target_user_id;

  if not found then
    raise exception 'Usuario de autenticacion no encontrado.';
  end if;
end;
$$;

create or replace function public.admin_auth_create_user(
  new_email text,
  new_password text,
  new_user_meta jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = auth, extensions, public
as $$
declare
  new_user_id uuid := gen_random_uuid();
begin
  if not public.admin_auth_can_manage() then
    raise exception 'Solo administradores pueden crear usuarios.';
  end if;

  if new_email is null or length(trim(new_email)) = 0 then
    raise exception 'El correo es obligatorio.';
  end if;

  if new_password is null or length(trim(new_password)) < 6 then
    raise exception 'La contraseña debe tener al menos 6 caracteres.';
  end if;

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    lower(trim(new_email)),
    crypt(trim(new_password), gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    coalesce(new_user_meta, '{}'::jsonb),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at,
    email
  ) values (
    gen_random_uuid(),
    new_user_id,
    jsonb_build_object(
      'sub', new_user_id::text,
      'email', lower(trim(new_email)),
      'email_verified', true
    ),
    'email',
    new_user_id::text,
    now(),
    now(),
    now(),
    lower(trim(new_email))
  );

  return new_user_id;
end;
$$;

revoke all on function public.admin_auth_can_manage() from public;
revoke all on function public.admin_auth_set_password(uuid, text) from public;
revoke all on function public.admin_auth_update_user(uuid, text, jsonb) from public;
revoke all on function public.admin_auth_set_ban(uuid, timestamptz) from public;
revoke all on function public.admin_auth_delete_user(uuid) from public;
revoke all on function public.admin_auth_create_user(text, text, jsonb) from public;

grant execute on function public.admin_auth_can_manage() to authenticated;
grant execute on function public.admin_auth_set_password(uuid, text) to authenticated;
grant execute on function public.admin_auth_update_user(uuid, text, jsonb) to authenticated;
grant execute on function public.admin_auth_set_ban(uuid, timestamptz) to authenticated;
grant execute on function public.admin_auth_delete_user(uuid) to authenticated;
grant execute on function public.admin_auth_create_user(text, text, jsonb) to authenticated;
