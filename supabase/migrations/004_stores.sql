-- Stores catalog + per-line-item store tracking
-- Run after 001_initial.sql, 002_storage.sql, 003_rls_update_policies.sql (if used)

create table if not exists public.stores (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists stores_user_updated_idx on public.stores (user_id, updated_at);

alter table public.line_items
  add column if not exists preferred_store_id uuid references public.stores (id) on delete set null,
  add column if not exists purchased_store_id uuid references public.stores (id) on delete set null;

create index if not exists line_items_preferred_store_idx on public.line_items (preferred_store_id);
create index if not exists line_items_purchased_store_idx on public.line_items (purchased_store_id);

alter table public.stores enable row level security;

create policy "stores_select_own" on public.stores for select using (auth.uid() = user_id);
create policy "stores_insert_own" on public.stores for insert with check (auth.uid() = user_id);
create policy "stores_update_own" on public.stores for update using (auth.uid() = user_id);
create policy "stores_delete_own" on public.stores for delete using (auth.uid() = user_id);

-- Backfill Fareway for existing accounts
insert into public.stores (id, user_id, name, updated_at)
select gen_random_uuid(), u.user_id, 'Fareway', now()
from (
  select distinct user_id from public.shopping_trips
  union
  select distinct user_id from public.line_items
) u
where not exists (
  select 1 from public.stores s where s.user_id = u.user_id and s.name = 'Fareway'
);

update public.shopping_trips st
set store_name = 'Fareway', updated_at = now()
where st.status in ('shopping', 'pending_review', 'complete')
  and (st.store_name is null or st.store_name = '');

update public.line_items li
set purchased_store_id = s.id, updated_at = now()
from public.stores s
inner join public.shopping_trips t on t.id = li.trip_id
where s.user_id = li.user_id
  and s.name = 'Fareway'
  and t.status in ('shopping', 'pending_review', 'complete')
  and li.purchased_store_id is null;
