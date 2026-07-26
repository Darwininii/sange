-- Allow clients without document number (multiple empty values ok)

alter table public.clients
  alter column document_number set default '';

alter table public.clients
  drop constraint if exists clients_document_number_unique;

create unique index if not exists clients_document_number_unique_idx
  on public.clients (document_number)
  where length(trim(document_number)) > 0;
