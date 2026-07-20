-- Validate order parts against inventory and sync stock by delta (RI-03 / RI-04)

create or replace function public.inventory_parts_usage(parts jsonb)
returns table (product_id uuid, total_qty integer)
language sql
stable
set search_path = public
as $$
  select
    (item->>'productId')::uuid as product_id,
    sum(greatest(0, coalesce(nullif(item->>'quantity', '')::numeric, 0)))::integer as total_qty
  from jsonb_array_elements(coalesce(parts, '[]'::jsonb)) as item
  where coalesce(item->>'productId', '') ~*
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  group by 1
  having sum(greatest(0, coalesce(nullif(item->>'quantity', '')::numeric, 0))) > 0;
$$;

create or replace function public.sync_order_parts_inventory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_parts jsonb := '[]'::jsonb;
  new_parts jsonb := '[]'::jsonb;
  rec record;
  available integer;
  product_name text;
begin
  if tg_op = 'DELETE' then
    old_parts := coalesce(old.parts, '[]'::jsonb);
    new_parts := '[]'::jsonb;
  elsif tg_op = 'INSERT' then
    old_parts := '[]'::jsonb;
    new_parts := coalesce(new.parts, '[]'::jsonb);
  else
    old_parts := coalesce(old.parts, '[]'::jsonb);
    new_parts := coalesce(new.parts, '[]'::jsonb);
  end if;

  -- Validate referenced products exist
  for rec in
    select distinct (item->>'productId')::uuid as product_id
    from jsonb_array_elements(new_parts) as item
    where coalesce(item->>'productId', '') ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  loop
    if not exists (
      select 1 from public.inventory_products p where p.id = rec.product_id
    ) then
      raise exception 'Producto de inventario no encontrado (%).', rec.product_id
        using errcode = 'foreign_key_violation';
    end if;
  end loop;

  for rec in
    with old_usage as (
      select * from public.inventory_parts_usage(old_parts)
    ),
    new_usage as (
      select * from public.inventory_parts_usage(new_parts)
    ),
    deltas as (
      select
        coalesce(n.product_id, o.product_id) as product_id,
        coalesce(n.total_qty, 0) - coalesce(o.total_qty, 0) as delta_qty
      from new_usage n
      full outer join old_usage o on o.product_id = n.product_id
    )
    select d.product_id, d.delta_qty, p.name, p.quantity
    from deltas d
    join public.inventory_products p on p.id = d.product_id
    where d.delta_qty <> 0
  loop
    if rec.delta_qty > 0 and rec.quantity < rec.delta_qty then
      raise exception
        'Stock insuficiente para "%": disponible %, solicitado %.',
        rec.name,
        rec.quantity,
        rec.delta_qty
        using errcode = 'check_violation';
    end if;

    update public.inventory_products
    set quantity = quantity - rec.delta_qty
    where id = rec.product_id
    returning quantity into available;

    if available < 0 then
      raise exception
        'Stock insuficiente para "%".',
        rec.name
        using errcode = 'check_violation';
    end if;
  end loop;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_sync_parts_inventory on public.orders;

create trigger orders_sync_parts_inventory
before insert or update of parts or delete
on public.orders
for each row
execute function public.sync_order_parts_inventory();

-- Storage: keep public bucket URLs, remove broad listing policy
drop policy if exists "Public can read inventory product images" on storage.objects;
