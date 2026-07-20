-- Allow public read for product images (bucket is public)

drop policy if exists "Public can read inventory product images" on storage.objects;

create policy "Public can read inventory product images"
on storage.objects
for select
to public
using (bucket_id = 'inventory-products');
