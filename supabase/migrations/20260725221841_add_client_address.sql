-- Client address on clients catalog and denormalized copy on orders

alter table public.clients
  add column if not exists address text not null default '';

alter table public.orders
  add column if not exists client_address text not null default '';
