-- ============================================
-- 1. ITEMS TABLE
-- ============================================

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),

  kind text not null
    check (kind in ('lost', 'found')),

  title text not null,

  description text,

  category text not null default 'Other',

  location text not null,

  date_happened date not null default current_date,

  contact text not null,

  image_url text,
  photo_url text,

  status text not null default 'open'
    check (status in ('open', 'claimed')),

  claimed_at timestamptz,

  created_at timestamptz default now()
);

alter table public.items
  add column if not exists image_url text;

alter table public.items
  add column if not exists photo_url text;

alter table public.items
  add column if not exists claimed_at timestamptz;


-- ============================================
-- 2. ADMINS TABLE
-- ============================================

create table if not exists public.admins (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade
);


-- ============================================
-- 3. ITEM COMMENTS
-- ============================================

create table if not exists public.item_comments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  comment text not null check (length(trim(comment)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.client_login_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  logged_in_at timestamptz not null default now(),
  user_agent text
);

create index if not exists item_comments_item_created_idx
  on public.item_comments (item_id, created_at);

create index if not exists client_login_history_logged_in_at_idx
  on public.client_login_history (logged_in_at desc);


-- ============================================
-- 3. ENABLE RLS
-- ============================================

alter table public.items enable row level security;
alter table public.admins enable row level security;
alter table public.item_comments enable row level security;
alter table public.client_login_history enable row level security;


-- ============================================
-- 4. REMOVE OLD ITEM POLICIES
-- ============================================

drop policy if exists "Anyone can read items"
on public.items;

drop policy if exists "Anyone can report items"
on public.items;

drop policy if exists "Authenticated users can report items"
on public.items;

drop policy if exists "Authenticated users can update items"
on public.items;

drop policy if exists "Authenticated users can delete items"
on public.items;

drop policy if exists "anyone can read items"
on public.items;

drop policy if exists "anyone can report items"
on public.items;

drop policy if exists "only admins can update"
on public.items;

drop policy if exists "only admins can delete"
on public.items;


-- ============================================
-- 5. REMOVE OLD ADMIN POLICY
-- ============================================

drop policy if exists "read own admin row"
on public.admins;


-- ============================================
-- 6. ADMIN CHECK FUNCTION
-- ============================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.admins
    where user_id = auth.uid()
  );
$$;


-- ============================================
-- 7. ADMIN TABLE POLICY
-- ============================================

create policy "Users can check their own admin status"
on public.admins
for select
to authenticated
using (
  auth.uid() = user_id
);


-- ============================================
-- 8. ITEMS POLICIES
-- ============================================

-- Anyone can view lost/found items
create policy "Anyone can read items"
on public.items
for select
using (true);


-- Signed-in clients can report items
create policy "Authenticated users can report items"
on public.items
for insert
to authenticated
with check (
  status = 'open'
);


-- ONLY ADMINS can update items
create policy "Admins can update items"
on public.items
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


-- ONLY ADMINS can delete items
create policy "Admins can delete items"
on public.items
for delete
to authenticated
using (
  public.is_admin()
);


-- ============================================
-- 9. ITEM COMMENT POLICIES
-- ============================================

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

-- ============================================
-- 10. CLIENT LOGIN HISTORY POLICIES
-- ============================================

drop policy if exists "Clients can insert own login history"
on public.client_login_history;
create policy "Clients can insert own login history"
on public.client_login_history
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Admins can read client login history"
on public.client_login_history;
create policy "Admins can read client login history"
on public.client_login_history
for select
to authenticated
using (public.is_admin());

grant insert on public.client_login_history to authenticated;
grant select on public.client_login_history to authenticated;
revoke update, delete on public.client_login_history from anon, authenticated;


-- ============================================
-- 10. REALTIME
-- ============================================

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'items'
  ) then

    alter publication supabase_realtime
    add table public.items;

  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'client_login_history'
  ) then
    alter publication supabase_realtime
    add table public.client_login_history;
  end if;
end $$;


-- ============================================
-- 11. STORAGE BUCKET
-- ============================================

insert into storage.buckets (
  id,
  name,
  public
)
values (
  'item-images',
  'item-images',
  true
)
on conflict (id) do nothing;

drop policy if exists "Anyone can read item images"
on storage.objects;
create policy "Anyone can read item images"
on storage.objects
for select
using (bucket_id = 'item-images');

drop policy if exists "Anyone can upload item images"
on storage.objects;
drop policy if exists "Authenticated users can upload item images"
on storage.objects;
create policy "Authenticated users can upload item images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'item-images');

drop policy if exists "Admins can delete item images"
on storage.objects;
create policy "Admins can delete item images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'item-images'
  and exists (
    select 1
    from public.admins a
    where a.user_id = auth.uid()
  )
);