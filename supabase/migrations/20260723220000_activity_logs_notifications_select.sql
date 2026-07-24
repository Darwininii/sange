-- Allow active staff to read ops notifications (orders + inventory).
-- Admins keep full read access via the existing admin policy.

create policy "Staff can read notification activity logs"
on public.activity_logs
for select
to authenticated
using (
  public.is_active_staff()
  and action in (
    'order_create',
    'order_update',
    'order_message',
    'inventory_create',
    'inventory_update',
    'inventory_delete'
  )
);

create index if not exists activity_logs_action_created_at_idx
on public.activity_logs (action, created_at desc);
