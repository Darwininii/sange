-- Optional schedule for when an assigned technician should see the order.
-- NULL = immediate (current behavior).

alter table public.orders
  add column if not exists scheduled_at timestamptz;

create index if not exists orders_assigned_technician_scheduled_at_idx
on public.orders (assigned_technician_id, scheduled_at);
