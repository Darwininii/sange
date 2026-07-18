-- Remove observaciones (orders.notes) and bitacora (order_notes)
drop policy if exists "Active staff can read order notes" on public.order_notes;
drop policy if exists "Active staff can create order notes" on public.order_notes;

drop table if exists public.order_notes cascade;

alter table public.orders
  drop column if exists notes;
