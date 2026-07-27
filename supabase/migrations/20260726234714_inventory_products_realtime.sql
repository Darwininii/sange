-- Broadcast inventory stock changes to open clients (orders / inventory UI).

do $$
begin
  alter publication supabase_realtime add table public.inventory_products;
exception
  when duplicate_object then
    null;
end;
$$;
