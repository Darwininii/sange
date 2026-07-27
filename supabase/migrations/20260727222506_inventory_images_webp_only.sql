-- Inventory uploads are always client-rewritten to WebP before storage.
-- Restrict the bucket so non-WebP payloads are rejected at the Storage layer.

update storage.buckets
set
  allowed_mime_types = array['image/webp']::text[],
  file_size_limit = 5242880
where id = 'inventory-products';
