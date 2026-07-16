-- Snapshot author display name for shared bitacora visibility
alter table public.order_notes
  add column if not exists author_name text not null default '';
