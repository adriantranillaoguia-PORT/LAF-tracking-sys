create table if not exists public.item_comments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null
    references public.items(id)
    on delete cascade,
  user_id uuid
    references auth.users(id)
    on delete set null,
  comment text not null
    check (length(trim(comment)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists item_comments_item_created_idx
  on public.item_comments (item_id, created_at);

alter table public.item_comments enable row level security;

drop policy if exists "Anyone can view item comments"
on public.item_comments;
create policy "Anyone can view item comments"
on public.item_comments
for select
using (true);

drop policy if exists "Authenticated users can comment"
on public.item_comments;
create policy "Authenticated users can comment"
on public.item_comments
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Admins can delete item comments"
on public.item_comments;
create policy "Admins can delete item comments"
on public.item_comments
for delete
to authenticated
using (public.is_admin());

grant select on public.item_comments to anon, authenticated;
grant insert, delete on public.item_comments to authenticated;

notify pgrst, 'reload schema';