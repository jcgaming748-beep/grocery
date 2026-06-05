-- Grocery Tracker: initial schema with RLS
-- Run in Supabase SQL Editor after creating your project.

-- Products catalog
create table if not exists public.products (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  barcode text not null,
  name text not null,
  default_unit_price numeric(10, 2),
  category text,
  last_used_at timestamptz,
  image_path text,
  updated_at timestamptz not null default now(),
  unique (user_id, barcode)
);

create index if not exists products_user_updated_idx on public.products (user_id, updated_at);

-- Shopping trips
create table if not exists public.shopping_trips (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date timestamptz not null,
  store_name text,
  notes text,
  status text not null check (status in ('planning', 'shopping', 'pending_review', 'complete')),
  receipt_total numeric(10, 2),
  updated_at timestamptz not null default now()
);

create index if not exists shopping_trips_user_updated_idx on public.shopping_trips (user_id, updated_at);
create index if not exists shopping_trips_user_status_idx on public.shopping_trips (user_id, status);

-- Line items
create table if not exists public.line_items (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  trip_id uuid not null references public.shopping_trips (id) on delete cascade,
  product_name text not null,
  barcode text,
  quantity numeric(10, 3) not null default 1,
  unit_price numeric(10, 2) not null default 0,
  product_id uuid references public.products (id) on delete set null,
  confirmed boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists line_items_user_updated_idx on public.line_items (user_id, updated_at);
create index if not exists line_items_trip_idx on public.line_items (trip_id);

-- Row Level Security
alter table public.products enable row level security;
alter table public.shopping_trips enable row level security;
alter table public.line_items enable row level security;

create policy "products_select_own" on public.products for select using (auth.uid() = user_id);
create policy "products_insert_own" on public.products for insert with check (auth.uid() = user_id);
create policy "products_update_own" on public.products for update using (auth.uid() = user_id);
create policy "products_delete_own" on public.products for delete using (auth.uid() = user_id);

create policy "trips_select_own" on public.shopping_trips for select using (auth.uid() = user_id);
create policy "trips_insert_own" on public.shopping_trips for insert with check (auth.uid() = user_id);
create policy "trips_update_own" on public.shopping_trips for update using (auth.uid() = user_id);
create policy "trips_delete_own" on public.shopping_trips for delete using (auth.uid() = user_id);

create policy "line_items_select_own" on public.line_items for select using (auth.uid() = user_id);
create policy "line_items_insert_own" on public.line_items for insert with check (auth.uid() = user_id);
create policy "line_items_update_own" on public.line_items for update using (auth.uid() = user_id);
create policy "line_items_delete_own" on public.line_items for delete using (auth.uid() = user_id);

-- Storage bucket for product images (create bucket "product-images" in dashboard, set to private)
-- Then run these storage policies:

-- insert into storage.buckets (id, name, public) values ('product-images', 'product-images', false)
-- on conflict do nothing;

-- create policy "product_images_select_own"
--   on storage.objects for select
--   using (bucket_id = 'product-images' and auth.uid()::text = (storage.foldername(name))[1]);

-- create policy "product_images_insert_own"
--   on storage.objects for insert
--   with check (bucket_id = 'product-images' and auth.uid()::text = (storage.foldername(name))[1]);

-- create policy "product_images_update_own"
--   on storage.objects for update
--   using (bucket_id = 'product-images' and auth.uid()::text = (storage.foldername(name))[1]);

-- create policy "product_images_delete_own"
--   on storage.objects for delete
--   using (bucket_id = 'product-images' and auth.uid()::text = (storage.foldername(name))[1]);
