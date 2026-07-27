-- Broadcast order updates (e.g. technician diagnosis) to open order forms.

do $$
begin
  alter publication supabase_realtime add table public.orders;
exception
  when duplicate_object then
    null;
end;
$$;
