-- Allow "Ventas" as a service condition (tipo de servicio).

alter table public.orders
  drop constraint if exists orders_service_condition_check;

alter table public.orders
  add constraint orders_service_condition_check
  check (
    service_condition is null
    or service_condition in ('warranty', 'billed', 'installation', 'sales')
  );
