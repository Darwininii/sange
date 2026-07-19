-- PDF slip fields: dates, symptom, diagnosis, and parts grid (inventory later)

alter table public.orders
  add column if not exists delivery_date date,
  add column if not exists repair_date date,
  add column if not exists purchase_date date,
  add column if not exists symptom text not null default '',
  add column if not exists diagnosis text not null default '',
  add column if not exists parts jsonb not null default '[]'::jsonb;
