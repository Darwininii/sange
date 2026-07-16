-- Expand orders for service creation flow (req. 4.1 / 4.2) + notes bitacora (RN-01..03)

alter table public.orders
  add column if not exists serial_number text not null default '',
  add column if not exists service_type text,
  add column if not exists service_condition text,
  add column if not exists service_cost numeric(12, 2),
  add column if not exists previous_service_notes text not null default '',
  add column if not exists document_number text not null default '',
  add column if not exists external_order_number text not null default '';

alter table public.orders
  drop constraint if exists orders_service_type_check;

alter table public.orders
  add constraint orders_service_type_check
  check (
    service_type is null
    or service_type in ('installation', 'maintenance', 'review')
  );

alter table public.orders
  drop constraint if exists orders_service_condition_check;

alter table public.orders
  add constraint orders_service_condition_check
  check (
    service_condition is null
    or service_condition in ('warranty', 'billed', 'installation')
  );

create index if not exists orders_document_number_idx
on public.orders (document_number);

create index if not exists orders_external_order_number_idx
on public.orders (external_order_number);

create table if not exists public.order_notes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default '',
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists order_notes_order_id_created_at_idx
on public.order_notes (order_id, created_at asc);

alter table public.order_notes enable row level security;

drop policy if exists "Active staff can read order notes" on public.order_notes;
drop policy if exists "Active staff can create order notes" on public.order_notes;

create policy "Active staff can read order notes"
on public.order_notes
for select
to authenticated
using (public.is_active_staff());

create policy "Active staff can create order notes"
on public.order_notes
for insert
to authenticated
with check (
  public.is_active_staff()
  and user_id = auth.uid()
);

grant select, insert on public.order_notes to authenticated;
