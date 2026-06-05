-- Fix RLS update policies (WITH CHECK required for upsert updates)
-- Run if sync fails with row-level security errors.

drop policy if exists "products_update_own" on public.products;
drop policy if exists "trips_update_own" on public.shopping_trips;
drop policy if exists "line_items_update_own" on public.line_items;

create policy "products_update_own"
  on public.products for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "trips_update_own"
  on public.shopping_trips for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "line_items_update_own"
  on public.line_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
