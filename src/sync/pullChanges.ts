import { db } from '@/db/database';
import type { LineItem, Product, ShoppingTrip } from '@/db/schema';
import { requireSupabase } from '@/lib/supabase';
import type { RemoteLineItem, RemoteProduct, RemoteShoppingTrip } from '@/lib/supabaseTypes';
import { remoteToLineItem, remoteToProduct, remoteToTrip } from '@/sync/mappers';
import { downloadProductImageIfNeeded } from '@/sync/imageSync';
import { getLastPullAt, setLastPullAt } from '@/sync/meta';

async function upsertProductIfNewer(record: Product): Promise<void> {
  const existing = await db.products.get(record.id);
  if (existing && existing.updatedAt >= record.updatedAt) return;
  await db.products.put(record);
}

async function upsertTripIfNewer(record: ShoppingTrip): Promise<void> {
  const existing = await db.shoppingTrips.get(record.id);
  if (existing && existing.updatedAt >= record.updatedAt) return;
  await db.shoppingTrips.put(record);
}

async function upsertLineItemIfNewer(record: LineItem): Promise<void> {
  const existing = await db.lineItems.get(record.id);
  if (existing && existing.updatedAt >= record.updatedAt) return;
  await db.lineItems.put(record);
}

export async function pullChanges(userId: string): Promise<void> {
  const client = requireSupabase();
  const since = await getLastPullAt();
  const pullStartedAt = new Date().toISOString();

  const [productsRes, tripsRes, itemsRes] = await Promise.all([
    client
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', since)
      .order('updated_at', { ascending: true }),
    client
      .from('shopping_trips')
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', since)
      .order('updated_at', { ascending: true }),
    client
      .from('line_items')
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', since)
      .order('updated_at', { ascending: true }),
  ]);

  if (productsRes.error) throw productsRes.error;
  if (tripsRes.error) throw tripsRes.error;
  if (itemsRes.error) throw itemsRes.error;

  for (const remote of (productsRes.data ?? []) as RemoteProduct[]) {
    const product = remoteToProduct(remote);
    await upsertProductIfNewer(product);
    await downloadProductImageIfNeeded(product.id);
  }

  for (const remote of (tripsRes.data ?? []) as RemoteShoppingTrip[]) {
    await upsertTripIfNewer(remoteToTrip(remote));
  }

  for (const remote of (itemsRes.data ?? []) as RemoteLineItem[]) {
    await upsertLineItemIfNewer(remoteToLineItem(remote));
  }

  await setLastPullAt(pullStartedAt);
}

export async function pullAll(userId: string): Promise<void> {
  await setLastPullAt('1970-01-01T00:00:00.000Z');
  await pullChanges(userId);
}
