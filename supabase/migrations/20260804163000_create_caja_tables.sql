-- Caja / finanzas: cierre diario y movimientos generales (gastos / ingresos)

create table if not exists public.cash_closes (
  id uuid primary key default gen_random_uuid(),
  close_date date not null unique,
  closed_at timestamptz not null default now(),
  closed_by uuid references public.profiles(id) on delete set null,
  cash_total numeric(14, 2) not null default 0,
  bank_total numeric(14, 2) not null default 0,
  income_total numeric(14, 2) not null default 0,
  expense_total numeric(14, 2) not null default 0,
  net_total numeric(14, 2) not null default 0,
  notes text not null default '',
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cash_closes_close_date_idx
on public.cash_closes (close_date desc);

alter table public.cash_closes enable row level security;

drop policy if exists "Active staff can read cash closes" on public.cash_closes;
drop policy if exists "Active staff can create cash closes" on public.cash_closes;

create policy "Active staff can read cash closes"
on public.cash_closes
for select
to authenticated
using (public.is_active_staff());

create policy "Active staff can create cash closes"
on public.cash_closes
for insert
to authenticated
with check (public.is_active_staff());

grant select, insert on public.cash_closes to authenticated;

create table if not exists public.cash_entries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('income', 'expense')),
  amount numeric(14, 2) not null check (amount > 0),
  payment_type text not null default 'cash' check (payment_type in ('cash', 'bank')),
  bank text not null default '',
  concept text not null,
  occurred_on date not null default (timezone('America/Bogota', now()))::date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cash_entries_occurred_on_idx
on public.cash_entries (occurred_on desc);

create index if not exists cash_entries_kind_idx
on public.cash_entries (kind);

create or replace function public.set_cash_entries_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cash_entries_set_updated_at on public.cash_entries;

create trigger cash_entries_set_updated_at
before update on public.cash_entries
for each row
execute function public.set_cash_entries_updated_at();

alter table public.cash_entries enable row level security;

drop policy if exists "Active staff can read cash entries" on public.cash_entries;
drop policy if exists "Active staff can create cash entries" on public.cash_entries;
drop policy if exists "Admins can update cash entries" on public.cash_entries;
drop policy if exists "Admins can delete cash entries" on public.cash_entries;

create policy "Active staff can read cash entries"
on public.cash_entries
for select
to authenticated
using (public.is_active_staff());

create policy "Active staff can create cash entries"
on public.cash_entries
for insert
to authenticated
with check (public.is_active_staff());

create policy "Admins can update cash entries"
on public.cash_entries
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and coalesce(p.access_revoked, false) = false
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and coalesce(p.access_revoked, false) = false
  )
);

create policy "Admins can delete cash entries"
on public.cash_entries
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and coalesce(p.access_revoked, false) = false
  )
);

grant select, insert, update, delete on public.cash_entries to authenticated;
