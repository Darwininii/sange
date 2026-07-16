-- Harden orders helper functions after initial create
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

revoke execute on function public.is_active_staff() from anon, public;
grant execute on function public.is_active_staff() to authenticated;
