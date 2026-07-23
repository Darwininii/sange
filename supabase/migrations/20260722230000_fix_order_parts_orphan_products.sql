-- Allow saving orders when parts reference deleted inventory products.
-- Orphan productId values are cleared; stock sync only touches existing products.

create or replace function public.sync_order_parts_inventory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_parts jsonb := '[]'::jsonb;
  new_parts jsonb := '[]'::jsonb;
  sanitized jsonb := '[]'::jsonb;
  item jsonb;
  product_id_text text;
  rec record;
  available integer;
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

  -- Drop product links that no longer exist; keep part text for the order/PDF.
  if tg_op <> 'DELETE' then
    for item in
      select value
      from jsonb_array_elements(coalesce(new_parts, '[]'::jsonb)) as t(value)
    loop
      product_id_text := coalesce(item->>'productId', '');

      if product_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         and not exists (
           select 1
           from public.inventory_products p
           where p.id = product_id_text::uuid
         )
      then
        item := item || jsonb_build_object('productId', '', 'stock', null);
      end if;

      sanitized := sanitized || jsonb_build_array(item);
    end loop;

    new.parts := sanitized;
    new_parts := sanitized;
  end if;

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

-- Clean current orphan product links in existing orders
update public.orders o
set parts = (
  select coalesce(
    jsonb_agg(
      case
        when coalesce(item->>'productId', '') ~*
          '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          and not exists (
            select 1
            from public.inventory_products p
            where p.id = (item->>'productId')::uuid
          )
        then item || jsonb_build_object('productId', '', 'stock', null)
        else item
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(coalesce(o.parts, '[]'::jsonb)) as item
)
where exists (
  select 1
  from jsonb_array_elements(coalesce(o.parts, '[]'::jsonb)) as item
  where coalesce(item->>'productId', '') ~*
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and not exists (
      select 1
      from public.inventory_products p
      where p.id = (item->>'productId')::uuid
    )
);
