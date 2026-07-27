-- Suppliers catalog (proveedores)

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nit text not null default '',
  address text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists suppliers_name_idx
on public.suppliers (name);

create index if not exists suppliers_created_at_idx
on public.suppliers (created_at desc);

-- Allow many empty NITs; unique only when provided.
create unique index if not exists suppliers_nit_unique_idx
on public.suppliers (nit)
where nit <> '';

create or replace function public.set_suppliers_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists suppliers_set_updated_at on public.suppliers;

create trigger suppliers_set_updated_at
before update on public.suppliers
for each row
execute function public.set_suppliers_updated_at();

alter table public.suppliers enable row level security;

drop policy if exists "Active staff can read suppliers" on public.suppliers;
drop policy if exists "Active staff can create suppliers" on public.suppliers;
drop policy if exists "Active staff can update suppliers" on public.suppliers;
drop policy if exists "Active staff can delete suppliers" on public.suppliers;

create policy "Active staff can read suppliers"
on public.suppliers
for select
to authenticated
using (public.is_active_staff());

create policy "Active staff can create suppliers"
on public.suppliers
for insert
to authenticated
with check (
  public.is_active_staff()
  and (created_by is null or created_by = auth.uid())
);

create policy "Active staff can update suppliers"
on public.suppliers
for update
to authenticated
using (public.is_active_staff())
with check (public.is_active_staff());

create policy "Active staff can delete suppliers"
on public.suppliers
for delete
to authenticated
using (public.is_active_staff());

grant select, insert, update, delete on public.suppliers to authenticated;
