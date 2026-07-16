-- Optional technician assignment on orders + staff can list technicians
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
