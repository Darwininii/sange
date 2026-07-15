create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  last_name text not null default '',
  nickname text,
  email text unique,
  identification text,
  phone text,
  area text,
  role text not null check (role in ('admin', 'cashier', 'technician')),
  access_revoked boolean not null default false,
  must_change_password boolean not null default false,
  temporary_password_expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists email text unique,
  add column if not exists last_name text not null default '',
  add column if not exists nickname text,
  add column if not exists identification text,
  add column if not exists phone text,
  add column if not exists area text,
  add column if not exists access_revoked boolean not null default false,
  add column if not exists must_change_password boolean not null default false,
  add column if not exists temporary_password_expires_at timestamptz;

update public.profiles
set area = role
where area is null;

alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and access_revoked = false
  );
$$;

drop policy if exists "Admins can read all profiles" on public.profiles;

create policy "Admins can read all profiles"
on public.profiles
for select
to authenticated
using (public.is_admin());

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.activity_logs enable row level security;

drop policy if exists "Users can register their own activity" on public.activity_logs;
drop policy if exists "Admins can read all activity logs" on public.activity_logs;

create policy "Users can register their own activity"
on public.activity_logs
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Admins can read all activity logs"
on public.activity_logs
for select
to authenticated
using (public.is_admin());

create index if not exists activity_logs_user_id_created_at_idx
on public.activity_logs (user_id, created_at desc);
