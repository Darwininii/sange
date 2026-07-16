-- Orders table for service tickets (create / edit / list)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigserial not null unique,
  client_name text not null,
  client_phone text not null default '',
  device text not null,
  brand text not null default '',
  model text not null default '',
  issue text not null,
  notes text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx
on public.orders (created_at desc);

create index if not exists orders_status_idx
on public.orders (status);

create or replace function public.set_orders_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on public.orders;

create trigger orders_set_updated_at
before update on public.orders
for each row
execute function public.set_orders_updated_at();

create or replace function public.is_active_staff()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and access_revoked = false
  );
$$;

alter table public.orders enable row level security;

drop policy if exists "Active staff can read orders" on public.orders;
drop policy if exists "Active staff can create orders" on public.orders;
drop policy if exists "Active staff can update orders" on public.orders;

create policy "Active staff can read orders"
on public.orders
for select
to authenticated
using (public.is_active_staff());

create policy "Active staff can create orders"
on public.orders
for insert
to authenticated
with check (
  public.is_active_staff()
  and (created_by is null or created_by = auth.uid())
);

create policy "Active staff can update orders"
on public.orders
for update
to authenticated
using (public.is_active_staff())
with check (public.is_active_staff());

grant select, insert, update on public.orders to authenticated;
grant usage, select on sequence public.orders_order_number_seq to authenticated;

revoke execute on function public.is_active_staff() from anon, public;
grant execute on function public.is_active_staff() to authenticated;
