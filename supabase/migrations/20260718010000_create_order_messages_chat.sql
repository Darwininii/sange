-- Chat messages per order (no E2E encryption)
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

alter publication supabase_realtime add table public.order_messages;
