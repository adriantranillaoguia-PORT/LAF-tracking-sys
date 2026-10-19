drop policy if exists "Anyone can report items" on public.items;
drop policy if exists "anyone can report items" on public.items;
drop policy if exists "Authenticated users can report items" on public.items;

create policy "Authenticated users can report items"
on public.items
for insert
to authenticated
with check (status = 'open');

drop policy if exists "Anyone can upload item images" on storage.objects;
drop policy if exists "Authenticated users can upload item images" on storage.objects;

create policy "Authenticated users can upload item images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'item-images');