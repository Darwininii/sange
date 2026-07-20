-- Clients catalog for service orders

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document_number text not null,
  phone text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_document_number_unique unique (document_number)
);

create index if not exists clients_name_idx
on public.clients (name);

create index if not exists clients_created_at_idx
on public.clients (created_at desc);

create or replace function public.set_clients_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clients_set_updated_at on public.clients;

create trigger clients_set_updated_at
before update on public.clients
for each row
execute function public.set_clients_updated_at();

alter table public.clients enable row level security;

drop policy if exists "Active staff can read clients" on public.clients;
drop policy if exists "Active staff can create clients" on public.clients;
drop policy if exists "Active staff can update clients" on public.clients;
drop policy if exists "Active staff can delete clients" on public.clients;

create policy "Active staff can read clients"
on public.clients
for select
to authenticated
using (public.is_active_staff());

create policy "Active staff can create clients"
on public.clients
for insert
to authenticated
with check (
  public.is_active_staff()
  and (created_by is null or created_by = auth.uid())
);

create policy "Active staff can update clients"
on public.clients
for update
to authenticated
using (public.is_active_staff())
with check (public.is_active_staff());

create policy "Active staff can delete clients"
on public.clients
for delete
to authenticated
using (public.is_active_staff());

grant select, insert, update, delete on public.clients to authenticated;
