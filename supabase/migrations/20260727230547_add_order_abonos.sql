-- Abonos (partial payments) on orders; same JSONB pattern as parts.
alter table public.orders
  add column if not exists abonos jsonb not null default '[]'::jsonb;
