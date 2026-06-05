import { db } from '@/db/database';
import type { LineItem, Product, ShoppingTrip, SyncEntity } from '@/db/schema';
import { enqueueSync } from '@/sync/outbox';
import { requestSync } from '@/sync/syncEngine';
import { getSyncUserId } from '@/sync/syncContext';

export async function syncRecord(
  entity: SyncEntity,
  record: Product | ShoppingTrip | LineItem,
  options?: { pendingImageUpload?: boolean; delete?: boolean },
): Promise<void> {
  const userId = getSyncUserId();
  if (!userId) return;

  await enqueueSync({
    entity,
    operation: options?.delete ? 'delete' : 'upsert',
    record,
    userId,
    pendingImageUpload: options?.pendingImageUpload,
  });
  requestSync();
}

export async function localHasData(): Promise<boolean> {
  const [products, trips] = await Promise.all([db.products.count(), db.shoppingTrips.count()]);
  return products > 0 || trips > 0;
}
