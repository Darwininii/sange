-- Inventory products catalog (RI-01 foundation)

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

create index if not exists inventory_products_quantity_idx
on public.inventory_products (quantity);

create index if not exists inventory_products_created_at_idx
on public.inventory_products (created_at desc);

create unique index if not exists inventory_products_sku_unique_idx
on public.inventory_products (sku)
where sku <> '';

create or replace function public.set_inventory_products_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists inventory_products_set_updated_at on public.inventory_products;

create trigger inventory_products_set_updated_at
before update on public.inventory_products
for each row
execute function public.set_inventory_products_updated_at();

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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inventory-products',
  'inventory-products',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Active staff can read inventory product images" on storage.objects;
drop policy if exists "Active staff can upload inventory product images" on storage.objects;
drop policy if exists "Active staff can update inventory product images" on storage.objects;
drop policy if exists "Active staff can delete inventory product images" on storage.objects;

create policy "Active staff can read inventory product images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'inventory-products'
  and public.is_active_staff()
);

create policy "Active staff can upload inventory product images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'inventory-products'
  and public.is_active_staff()
);

create policy "Active staff can update inventory product images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'inventory-products'
  and public.is_active_staff()
)
with check (
  bucket_id = 'inventory-products'
  and public.is_active_staff()
);

create policy "Active staff can delete inventory product images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'inventory-products'
  and public.is_active_staff()
);
