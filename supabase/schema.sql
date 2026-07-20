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

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigserial not null unique,
  client_name text not null,
  client_phone text not null default '',
  device text not null,
  brand text not null default '',
  model text not null default '',
  serial_number text not null default '',
  service_type text
    check (
      service_type is null
      or service_type in ('installation', 'maintenance', 'review')
    ),
  service_condition text
    check (
      service_condition is null
      or service_condition in ('warranty', 'billed', 'installation')
    ),
  issue text not null,
  service_cost numeric(12, 2),
  previous_service_notes text not null default '',
  document_number text not null default '',
  external_order_number text not null default '',
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

create index if not exists orders_document_number_idx
on public.orders (document_number);

create index if not exists orders_external_order_number_idx
on public.orders (external_order_number);

alter table public.orders
  add column if not exists assigned_technician_id uuid references public.profiles(id) on delete set null;

create index if not exists orders_assigned_technician_id_idx
on public.orders (assigned_technician_id);

drop policy if exists "Active staff can read technician profiles" on public.profiles;

create policy "Active staff can read technician profiles"
on public.profiles
for select
to authenticated
using (
  public.is_active_staff()
  and role = 'technician'
  and access_revoked = false
);

create table if not exists public.order_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists order_messages_order_id_created_at_idx
on public.order_messages (order_id, created_at asc);

alter table public.order_messages enable row level security;

drop policy if exists "Active staff can read order messages" on public.order_messages;
drop policy if exists "Active staff can create order messages" on public.order_messages;

create policy "Active staff can read order messages"
on public.order_messages
for select
to authenticated
using (public.is_active_staff());

create policy "Active staff can create order messages"
on public.order_messages
for insert
to authenticated
with check (
  public.is_active_staff()
  and user_id = auth.uid()
);

grant select, insert on public.order_messages to authenticated;

-- Inventory products (remote source of truth; images in storage bucket inventory-products)
create table if not exists public.inventory_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text not null default '',
  description text not null default '',
  quantity integer not null default 0 check (quantity >= 0),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  image_url text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inventory_products_name_idx
on public.inventory_products (name);

create unique index if not exists inventory_products_sku_unique_idx
on public.inventory_products (sku)
where sku <> '';

alter table public.inventory_products enable row level security;

drop policy if exists "Active staff can read inventory products" on public.inventory_products;
drop policy if exists "Active staff can create inventory products" on public.inventory_products;
drop policy if exists "Active staff can update inventory products" on public.inventory_products;
drop policy if exists "Active staff can delete inventory products" on public.inventory_products;

create policy "Active staff can read inventory products"
on public.inventory_products
for select
to authenticated
using (public.is_active_staff());

create policy "Active staff can create inventory products"
on public.inventory_products
for insert
to authenticated
with check (
  public.is_active_staff()
  and (created_by is null or created_by = auth.uid())
);

create policy "Active staff can update inventory products"
on public.inventory_products
for update
to authenticated
using (public.is_active_staff())
with check (public.is_active_staff());

create policy "Active staff can delete inventory products"
on public.inventory_products
for delete
to authenticated
using (public.is_active_staff());

grant select, insert, update, delete on public.inventory_products to authenticated;

-- Order slip fields used by PDF / inventory parts
alter table public.orders
  add column if not exists assigned_technician_id uuid references public.profiles(id) on delete set null,
  add column if not exists delivery_date date,
  add column if not exists repair_date date,
  add column if not exists purchase_date date,
  add column if not exists symptom text not null default '',
  add column if not exists diagnosis text not null default '',
  add column if not exists parts jsonb not null default '[]'::jsonb;
